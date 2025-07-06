'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Clock, Heart, List } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import {
  useReadingProgress,
  useSaveReadingProgress,
  formatReadingProgress,
  getLastReadTimestamp
} from '@/hooks/useReadingProgress';
import { useSpendPermissionGuard } from '@/hooks/use-spend-permission-guard';
import SpendPermissionRequired from '@/components/spend-permission-required';
import LoveAnimation from '@/components/love-animation';
import ChapterListModal from '@/components/chapter-list-modal';

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapterNumber: number;
  tipCount: number;
  novelRel?: {
    id: string;
    title: string;
    author: string;
  };
}

interface LoveAnimationState {
  id: number;
  x: number;
  y: number;
}

// Simple throttle function
function throttle(fn: () => void, delay = 200) {
  let last = 0;
  let timeout: number | null = null;
  return () => {
    const now = Date.now();
    const run = () => {
      last = now;
      timeout = null;
      fn();
    };
    if (now - last >= delay) {
      run();
    } else if (!timeout) {
      timeout = window.setTimeout(run, delay - (now - last));
    }
  };
}

export default function IndividualChapterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const novelId = params.id as string;
  const chapterId = params.chapterId as string;
  const startFromTop = searchParams.get('startFromTop') === 'true';
  const disableRestore = searchParams.get('noRestore') === 'true';

  // Spend permission guard hook
  const { isModalOpen, checkPermissionAndProceed, closeModal } = useSpendPermissionGuard();

  // Chapter state
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation state
  const [previousChapter, setPreviousChapter] = useState<{ id: string; title: string } | null>(
    null
  );
  const [nextChapter, setNextChapter] = useState<{ id: string; title: string } | null>(null);

  // Chapter list modal state
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);

  // Reading progress state - simplified
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedLineRef = useRef<number>(0);
  const hasRestoredRef = useRef(false);
  const lineOffsetsRef = useRef<number[]>([]);

  // Love/tip state
  const [hasLoved, setHasLoved] = useState(false);
  const [loveAnimations, setLoveAnimations] = useState<LoveAnimationState[]>([]);
  const [tipCount, setTipCount] = useState(0);
  const [tradePending, setTradePending] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState(false);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const userRef = useRef(user);
  const chapterIdRef = useRef(chapterId);
  const novelIdRef = useRef(novelId);
  const recentTipTimestampRef = useRef<number>(0);
  const animationIdRef = useRef(0);

  // Reading progress hooks
  const { readingProgress, mutate: mutateProgress } = useReadingProgress(
    (user as any)?.id,
    chapterId
  );
  const { saveProgress } = useSaveReadingProgress();

  // Debug reading progress hook
  useEffect(() => {
    console.log('[ReadingProgress] Hook state:', {
      userId: (user as any)?.id,
      chapterId,
      readingProgress,
      hasUser: !!user,
      hasUserId: !!(user as any)?.id
    });
  }, [(user as any)?.id, chapterId, readingProgress]);

  // Force revalidation when user becomes available
  useEffect(() => {
    if ((user as any)?.id && chapterId && mutateProgress) {
      console.log('[ReadingProgress] User available, forcing revalidation');
      mutateProgress();
    }
  }, [(user as any)?.id, chapterId, mutateProgress]);

  // Get user's chapter tip amount with fallback
  const chapterTipAmount = (user as any)?.chapterTipAmount || 0.01;
  const tipAmountDisplay = chapterTipAmount.toFixed(2);

  // Fetch chapter data
  const fetchChapter = useCallback(
    async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/chapters/${chapterId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Chapter not found');
          } else if (response.status >= 500 && retryCount < 2) {
            // Retry on server errors (up to 2 retries)
            console.log(`Server error, retrying... (attempt ${retryCount + 1})`);
            setTimeout(() => fetchChapter(retryCount + 1), 1000 * (retryCount + 1));
            return;
          } else {
            throw new Error(`Failed to fetch chapter (${response.status})`);
          }
        }

        const chapterData = await response.json();
        setChapter(chapterData);

        // Only update tipCount if we haven't recently completed a successful tip (within last 5 seconds)
        // This prevents the count from reverting after a successful tip operation
        const timeSinceLastTip = Date.now() - recentTipTimestampRef.current;
        if (timeSinceLastTip > 5000) {
          setTipCount(chapterData.tipCount || 0);
        }

        // Check if user has already tipped this chapter
        // But don't override hasLoved if we recently completed a successful tip
        const currentUser = userRef.current; // Use ref instead of dependency
        if ((currentUser as any)?.tips && timeSinceLastTip > 5000) {
          const hasAlreadyTipped = (currentUser as any).tips.some(
            (tip: any) => tip.chapterId === chapterId
          );
          setHasLoved(hasAlreadyTipped);
        } else if ((currentUser as any)?.tips && timeSinceLastTip <= 5000) {
          // If we recently tipped, only update hasLoved if the user actually has a tip
          // This ensures the visual state matches the database state
          const hasAlreadyTipped = (currentUser as any).tips.some(
            (tip: any) => tip.chapterId === chapterId
          );
          // Only update if the database confirms the tip exists
          if (hasAlreadyTipped && !hasLoved) {
            setHasLoved(true);
          }
        }
      } catch (err) {
        console.error('Error fetching chapter:', err);
        if (retryCount < 2 && err instanceof Error && !err.message.includes('not found')) {
          // Retry on network errors (but not 404s)
          console.log(`Network error, retrying... (attempt ${retryCount + 1})`);
          setTimeout(() => fetchChapter(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load chapter');
      } finally {
        setLoading(false);
      }
    },
    [chapterId, hasLoved] // Removed mutateProgress dependency
  );

  // Fetch navigation data
  const fetchNavigation = useCallback(async () => {
    try {
      const [prevResponse, nextResponse] = await Promise.all([
        fetch(`/api/chapters/${chapterId}/navigation?direction=prev`),
        fetch(`/api/chapters/${chapterId}/navigation?direction=next`)
      ]);

      if (prevResponse.ok) {
        const prevData = await prevResponse.json();
        setPreviousChapter(prevData.previousChapter);
      }

      if (nextResponse.ok) {
        const nextData = await nextResponse.json();
        setNextChapter(nextData.nextChapter);
      }
    } catch (err) {
      console.error('Error fetching navigation:', err);
    }
  }, [chapterId]);

  // Initialize scroll-based reading progress tracking
  useEffect(() => {
    if (!contentRef.current || !user || !(user as any)?.id || !chapter) {
      console.log('⏸️ Skipping scroll tracking init:', {
        hasContent: !!contentRef.current,
        hasUser: !!user,
        hasUserId: !!(user as any)?.id,
        hasChapter: !!chapter,
        debugInfo: 'Missing required data for tracking initialization'
      });
      return;
    }

    console.log('🔍 Initializing scroll-based reading progress for user:', (user as any)?.id);

    // 1) Collect line elements and their offsets
    const lineEls = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>('p, div, h1, h2, h3, h4, h5, h6')
    );
    const offsets = lineEls.map((el) => el.offsetTop);
    lineOffsetsRef.current = offsets;
    setTotalLines(offsets.length);

    console.log('📏 Collected', offsets.length, 'line offsets');

    // 2) Scroll handler - find the line at the middle of viewport
    const onScroll = throttle(() => {
      const mid = window.scrollY + window.innerHeight / 2;

      // Find the last offset ≤ mid
      let idx = offsets.findIndex((top, i) =>
        i === offsets.length - 1 ? top <= mid : top <= mid && offsets[i + 1] > mid
      );

      if (idx === -1) idx = 0;

      setCurrentLine(idx);

      // Auto-save if moved far enough
      const delta = Math.abs(idx - lastSavedLineRef.current);
      const threshold = Math.max(2, Math.min(10, Math.floor(offsets.length / 20)));

      console.log('[SaveProgress] Check:', {
        idx,
        lastSaved: lastSavedLineRef.current,
        delta,
        threshold,
        willSave: delta >= threshold,
        totalLines: offsets.length
      });

      if (delta >= threshold) {
        console.log('💾 Auto-saving progress:', idx, 'of', offsets.length);
        lastSavedLineRef.current = idx;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(() => {
          console.log('[SaveProgress] Timeout callback executed!');
          console.log('[SaveProgress] Attempting to save:', {
            userId: (user as any)?.id,
            chapterId,
            currentLine: idx,
            totalLines: offsets.length,
            scrollPosition: idx
          });

          if (!(user as any)?.id) {
            console.error('[SaveProgress] No user ID available for saving');
            return;
          }

          console.log('[SaveProgress] About to call saveProgress function');

          saveProgress({
            userId: (user as any)?.id,
            chapterId,
            currentLine: idx,
            totalLines: offsets.length,
            scrollPosition: idx
          })
            .then((result) => {
              console.log('[SaveProgress] Successfully saved progress:', result);
            })
            .catch((error) => {
              console.error('[SaveProgress] Failed to save progress:', error);
            });
        }, 100); // Reduced from 500ms to 100ms
      }
    }, 200);

    // 3) Hook up scroll listener
    window.addEventListener('scroll', onScroll, { passive: true });

    // Fire once to set initial position
    onScroll();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chapter?.id, (user as any)?.id, chapterId]); // Removed saveProgress dependency

  // Reset tracking state when chapter or user changes
  useEffect(() => {
    setCurrentLine(0);
    setTotalLines(0);
    lastSavedLineRef.current = 0;
    lineOffsetsRef.current = [];
    hasRestoredRef.current = false;

    console.log('🔄 Reset tracking state for new chapter/user');
  }, [chapter?.id, (user as any)?.id]);

  // Calculate progress percentage
  const progressPercentage = totalLines > 0 ? Math.round((currentLine / totalLines) * 100) : 0;

  // Keep refs up to date
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    chapterIdRef.current = chapterId;
  }, [chapterId]);
  useEffect(() => {
    novelIdRef.current = novelId;
  }, [novelId]);

  // Simplified scroll restore effect
  useEffect(() => {
    const pos = readingProgress?.currentLine;
    console.log('[ScrollRestore] readingProgress:', readingProgress);
    console.log('[ScrollRestore] pos:', pos);

    // If we have no reading progress, start from the top
    if (!readingProgress) {
      console.log('[ScrollRestore] No saved progress, starting from top');
      hasRestoredRef.current = true;
      setCurrentLine(0);
      lastSavedLineRef.current = 0;
      return;
    }

    // only proceed once we have a numeric line index
    if (typeof pos !== 'number' || hasRestoredRef.current) {
      console.log('[ScrollRestore] skipping – no valid position or already done');
      return;
    }

    const maxAttempts = 30;
    let attempts = 0;

    function tryRestore() {
      attempts++;
      const container = contentRef.current;
      if (!container) {
        if (attempts < maxAttempts) return requestAnimationFrame(tryRestore);
        console.warn('[ScrollRestore] giving up – no contentRef');
        return;
      }

      const lines = container.querySelectorAll<HTMLElement>('p, div, h1, h2, h3, h4, h5, h6');
      if (lines.length === 0) {
        if (attempts < maxAttempts) {
          console.log(`[ScrollRestore] attempt ${attempts}: no lines yet, retrying…`);
          return requestAnimationFrame(tryRestore);
        }
        console.warn('[ScrollRestore] giving up – no lines found');
        return;
      }

      // clamp pos into bounds
      const idx = Math.min(Math.max(0, pos as number), lines.length - 1);
      lines[idx].scrollIntoView({ block: 'center', behavior: 'auto' });
      console.log('[ScrollRestore] scrolled to line', idx);

      hasRestoredRef.current = true;
      setCurrentLine(idx);
      lastSavedLineRef.current = idx;
    }

    // kick it off
    tryRestore();
  }, [chapter, readingProgress]);

  // Love/tip handler
  const handleLove = useCallback(
    async (event?: React.MouseEvent) => {
      if (!chapter || !user || hasLoved || tradePending) return;

      if (event) {
        event.preventDefault();
        const x = event.clientX;
        const y = event.clientY;
        const newAnimation: LoveAnimationState = {
          id: animationIdRef.current++,
          x,
          y
        };
        setLoveAnimations((prev) => [...prev, newAnimation]);
      }

      // Immediate visual feedback
      setHasLoved(true);
      setTipCount((prev) => prev + 1);

      // Then execute backend logic
      setTradePending(true);
      setTradeError(null);
      setTradeSuccess(false);

      try {
        if (!(user as any)?.id) throw new Error('User not logged in');

        const response = await fetch('/api/tip-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId: chapter.id, userId: (user as any).id })
        });

        const data = await response.json();
        if (response.ok && data.status === 'success') {
          // Update with actual count from server (in case of discrepancy)
          setTipCount(data.tipCount);
          setTradeSuccess(true);
          // Mark the timestamp of successful tip to prevent fetchChapter from overriding
          recentTipTimestampRef.current = Date.now();
        } else {
          // Revert on failure
          setHasLoved(false);
          setTipCount((prev) => prev - 1);
          setTradeError(data.error || 'Auto-tip failed. Please try again.');
        }
      } catch (err: any) {
        // Revert on error
        setHasLoved(false);
        setTipCount((prev) => prev - 1);
        setTradeError(err.message || 'Auto-tip failed');
      }

      setTradePending(false);
    },
    [chapter?.id, hasLoved, tradePending, user]
  );

  const removeLoveAnimation = useCallback((id: number) => {
    setLoveAnimations((prev) => prev.filter((animation) => animation.id !== id));
  }, []);

  // Navigation handlers
  const goToPrevious = async () => {
    if (previousChapter) {
      const proceedWithNavigation = async () => {
        // Save current reading progress before navigating
        if (hasRestoredRef.current && currentLine > 0 && totalLines > 0) {
          console.log('📖 Saving progress before navigating to previous chapter');
          await saveProgress({
            userId: (user as any)?.id,
            chapterId,
            currentLine,
            totalLines,
            scrollPosition: currentLine
          });
        }
        router.push(`/novels/${novelId}/chapters/${previousChapter.id}`);
      };

      // Check permission before navigating
      checkPermissionAndProceed(user, proceedWithNavigation);
    }
  };

  const goToNext = async () => {
    if (nextChapter) {
      const proceedWithNavigation = async () => {
        // Save current reading progress before navigating
        if (hasRestoredRef.current && currentLine > 0 && totalLines > 0) {
          console.log('📖 Saving progress before navigating to next chapter');
          await saveProgress({
            userId: (user as any)?.id,
            chapterId,
            currentLine,
            totalLines,
            scrollPosition: currentLine
          });
        }
        router.push(`/novels/${novelId}/chapters/${nextChapter.id}?startFromTop=true`);
      };

      // Check permission before navigating
      checkPermissionAndProceed(user, proceedWithNavigation);
    }
  };

  const goBackToNovel = () => {
    router.push(`/novels/${novelId}`);
  };

  // Effects
  useEffect(() => {
    // Load chapter data immediately
    fetchChapter();
    fetchNavigation();
  }, [fetchChapter, fetchNavigation]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700/50 rounded mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-white">{error || 'Chapter not found'}</h1>
        {error && !error.includes('not found') && (
          <p className="text-gray-400 mb-6">
            There was a problem loading this chapter. This might be a temporary network issue.
          </p>
        )}
        <div className="space-y-3">
          {error && !error.includes('not found') && (
            <Button
              onClick={() => {
                setError(null);
                fetchChapter();
              }}
              className="bg-green-600 hover:bg-green-700 mr-3"
            >
              Try Again
            </Button>
          )}
          <Button onClick={goBackToNovel} className="bg-purple-600 hover:bg-purple-700">
            Back to Novel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 max-w-4xl">
      {/* Pinned Progress Bar - Minimal and always visible */}
      <div className="fixed top-16 left-0 right-0 z-[60] bg-black/60 backdrop-blur-sm">
        <div className="h-1 bg-gray-800/50">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Add top padding to account for pinned bar */}
      <div className="pt-2">
        {/* Back Button */}
        <div className="mb-3 px-2">
          <Button
            onClick={goBackToNovel}
            className="group flex items-center gap-2 bg-transparent text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to Novel
          </Button>
        </div>

        {/* Chapter Content */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 mx-0.5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white mb-2">{chapter.title}</CardTitle>
                {chapter.novelRel && (
                  <p className="text-gray-400 text-sm">
                    {chapter.novelRel.title} by {chapter.novelRel.author}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={contentRef}
              className="prose prose-lg max-w-none leading-relaxed text-gray-300"
              style={{ lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ __html: chapter.content }}
            />
            {tradeError && <div className="text-red-400 mt-4">{tradeError}</div>}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
              <Button
                onClick={goToPrevious}
                disabled={!previousChapter}
                className="flex items-center gap-2 bg-transparent border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                {previousChapter ? 'Previous' : 'First Chapter'}
              </Button>

              {/* Chapter List Button */}
              <Button
                onClick={() => setIsChapterListOpen(true)}
                className="flex items-center gap-2 bg-purple-600/20 border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-600/30 transition-all duration-200"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Chapters</span>
              </Button>

              <Button
                onClick={goToNext}
                disabled={!nextChapter}
                className="flex items-center gap-2 bg-transparent border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
              >
                {nextChapter ? 'Next' : 'Last Chapter'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Love Animations */}
      {loveAnimations.map((animation) => (
        <LoveAnimation
          key={animation.id}
          x={animation.x}
          y={animation.y}
          onComplete={() => removeLoveAnimation(animation.id)}
        />
      ))}

      {/* Floating Action Buttons - Back and Love, stacked and responsive */}
      <div className="fixed left-1 md:left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 md:gap-4 opacity-40 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
        <button
          type="button"
          onClick={goBackToNovel}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-full p-2 md:p-3 text-gray-400 hover:text-white hover:bg-white/20 active:bg-white/30 focus:bg-white/20 focus:outline-none transition-all duration-300 shadow-lg touch-manipulation mb-1"
          aria-label="Back to Novel"
        >
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        </button>
        <button
          type="button"
          onClick={(event) => handleLove(event)}
          disabled={hasLoved || tradePending}
          className={`focus:outline-none bg-white/5 backdrop-blur-sm border border-white/10 rounded-full p-2 md:p-3 text-gray-400 hover:text-red-500 hover:bg-red-100/20 active:bg-red-100/30 focus:bg-red-100/20 transition-all duration-300 shadow-lg ${
            hasLoved ? 'text-red-500 bg-red-100/20' : ''
          }`}
          aria-label={`Love this chapter ${tipAmountDisplay} USDC`}
        >
          <Heart
            className={`h-4 w-4 md:h-5 md:w-5 ${hasLoved ? 'fill-red-500 text-red-500' : ''}`}
          />
        </button>
        <span className="text-xs text-gray-300 font-semibold bg-black/40 rounded px-1.5 py-0.5 md:px-2 md:py-1 mt-1 shadow-md select-none">
          {tipCount}
        </span>
      </div>

      {/* Chapter List Modal */}
      <ChapterListModal
        isOpen={isChapterListOpen}
        onClose={() => setIsChapterListOpen(false)}
        novelId={novelId}
        currentChapterId={chapterId}
      />

      {/* Spend Permission Required Modal */}
      <SpendPermissionRequired isOpen={isModalOpen} onClose={closeModal} user={user} />
    </div>
  );
}

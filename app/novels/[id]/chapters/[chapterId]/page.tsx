'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  DollarSign,
  List
} from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import {
  useReadingProgress,
  useSaveReadingProgress,
  formatReadingProgress,
  getLastReadTimestamp
} from '@/hooks/useReadingProgress';
import LoveAnimation from '@/components/love-animation';
import ChapterListModal from '@/components/chapter-list-modal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

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

  // Force revalidation when user becomes available
  useEffect(() => {
    if ((user as any)?.id && chapterId && mutateProgress) {
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

        // Note: Love button state is now handled by a dedicated effect
        // to ensure proper synchronization with user's tips
      } catch (err) {
        console.error('Error fetching chapter:', err);
        if (retryCount < 2 && err instanceof Error && !err.message.includes('not found')) {
          // Retry on network errors (but not 404s)

          setTimeout(() => fetchChapter(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load chapter');
      } finally {
        setLoading(false);
      }
    },
    [chapterId]
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
      return;
    }

    // Add a small delay to ensure content is fully rendered
    const initTracking = () => {
      // 1) Collect line elements and their offsets
      const lineEls = Array.from(
        contentRef.current!.querySelectorAll<HTMLElement>('p, div, h1, h2, h3, h4, h5, h6')
      );

      const offsets = lineEls.map((el) => el.offsetTop);
      lineOffsetsRef.current = offsets;
      setTotalLines(offsets.length);

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

        if (delta >= threshold) {
          lastSavedLineRef.current = idx;

          // Clear existing timeout
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }

          // Set new timeout
          saveTimeoutRef.current = setTimeout(() => {
            if (!(user as any)?.id) {
              console.error('[SaveProgress] No user ID available for saving');
              return;
            }

            saveProgress({
              userId: (user as any)?.id,
              chapterId,
              currentLine: idx,
              totalLines: offsets.length,
              scrollPosition: idx
            })
              .then((result) => {})
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

      // Return cleanup function
      return () => {
        window.removeEventListener('scroll', onScroll);
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    };

    // Use requestAnimationFrame to ensure DOM is ready
    let scrollCleanup: (() => void) | null = null;
    const cleanup = requestAnimationFrame(() => {
      setTimeout(() => {
        scrollCleanup = initTracking();
      }, 100); // Small delay to ensure content is rendered
    });

    return () => {
      if (cleanup) {
        cancelAnimationFrame(cleanup);
      }
      if (scrollCleanup) {
        scrollCleanup();
      }
    };
  }, [chapter?.id, (user as any)?.id, chapterId]);

  // Reset tracking state when chapter or user changes
  useEffect(() => {
    if (chapter?.id && (user as any)?.id) {
      setCurrentLine(0);
      // Don't reset totalLines here - let the scroll tracking set it
      lastSavedLineRef.current = 0;
      lineOffsetsRef.current = [];
      hasRestoredRef.current = false;

      // Reset love button state when chapter changes
      setHasLoved(false);
      setTradePending(false);
      setTradeError(null);
      setTradeSuccess(false);
    }
  }, [chapter?.id, (user as any)?.id]);

  // Calculate progress percentage
  const progressPercentage = totalLines > 0 ? Math.round((currentLine / totalLines) * 100) : 0;

  // Fallback: Set totalLines if it's still 0 after content is loaded
  useEffect(() => {
    if (totalLines === 0 && contentRef.current && chapter) {
      const timer = setTimeout(() => {
        const lineEls = Array.from(
          contentRef.current!.querySelectorAll<HTMLElement>('p, div, h1, h2, h3, h4, h5, h6')
        );
        if (lineEls.length > 0) {
          setTotalLines(lineEls.length);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [totalLines, chapter]);

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

  // Sync love button state with user's tips
  useEffect(() => {
    if (!user || !chapterId) {
      setHasLoved(false);
      return;
    }

    const timeSinceLastTip = Date.now() - recentTipTimestampRef.current;

    // Don't override hasLoved if we recently completed a successful tip (within last 5 seconds)
    if (timeSinceLastTip <= 5000) {
      return;
    }

    // Check if user has already tipped this chapter
    const hasAlreadyTipped = (user as any)?.tips?.some((tip: any) => tip.chapterId === chapterId);

    setHasLoved(!!hasAlreadyTipped);
  }, [user, chapterId, hasLoved]);

  // Simplified scroll restore effect
  useEffect(() => {
    const pos = readingProgress?.currentLine;

    // If we have no reading progress, start from the top
    if (!readingProgress) {
      hasRestoredRef.current = true;
      setCurrentLine(0);
      lastSavedLineRef.current = 0;
      return;
    }

    // only proceed once we have a numeric line index
    if (typeof pos !== 'number' || hasRestoredRef.current) {
      return;
    }

    const maxAttempts = 30;
    let attempts = 0;

    function tryRestore() {
      attempts++;
      const container = contentRef.current;
      if (!container) {
        if (attempts < maxAttempts) return requestAnimationFrame(tryRestore);
        return;
      }

      const lines = container.querySelectorAll<HTMLElement>('p, div, h1, h2, h3, h4, h5, h6');
      if (lines.length === 0) {
        if (attempts < maxAttempts) {
          return requestAnimationFrame(tryRestore);
        }
        return;
      }

      // clamp pos into bounds
      const idx = Math.min(Math.max(0, pos as number), lines.length - 1);
      lines[idx].scrollIntoView({ block: 'center', behavior: 'auto' });

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
      // Save current reading progress before navigating
      if (hasRestoredRef.current && currentLine > 0 && totalLines > 0) {
        await saveProgress({
          userId: (user as any)?.id,
          chapterId,
          currentLine,
          totalLines,
          scrollPosition: currentLine
        });
      }
      router.push(`/novels/${novelId}/chapters/${previousChapter.id}`);
    }
  };

  const goToNext = async () => {
    if (nextChapter) {
      // Save current reading progress before navigating
      if (hasRestoredRef.current && currentLine > 0 && totalLines > 0) {
        await saveProgress({
          userId: (user as any)?.id,
          chapterId,
          currentLine,
          totalLines,
          scrollPosition: currentLine
        });
      }
      router.push(`/novels/${novelId}/chapters/${nextChapter.id}?startFromTop=true`);
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

  // --- Preprocess chapter content for readability ---
  function preprocessContent(raw: string): string {
    // Remove all <h4>...</h4> tags and their content
    let noH4 = raw.replace(/<h4[^>]*>[\s\S]*?<\/h4>/gi, '');
    // Remove any <p>...</p> or line containing 'NovelFire.net' (case-insensitive)
    // Remove <p> tags containing NovelFire.net
    noH4 = noH4.replace(/<p[^>]*>[^<]*NovelFire\.net[^<]*<\/p>/gi, '');
    // Remove any remaining lines containing NovelFire.net
    noH4 = noH4
      .split(/\n/)
      .filter((line) => !/NovelFire\.net/i.test(line))
      .join('\n');
    // If already contains <p> or <h1>, <h2>, <ul>, <ol>, <li>, <blockquote>, assume it's HTML
    if (/<\s*(p|h1|h2|h3|ul|ol|li|blockquote)[^>]*>/i.test(noH4)) {
      return noH4;
    }
    // Otherwise, split by double newlines or single newlines and wrap in <p>
    // Remove leading/trailing whitespace
    const trimmed = noH4.trim();
    // Split by two or more newlines (paragraphs)
    const paras = trimmed
      .split(/\n{2,}/)
      .map((para) => para.trim())
      .filter(Boolean);
    // If only one paragraph, try splitting by single newlines
    const finalParas =
      paras.length > 1
        ? paras
        : trimmed
            .split(/\n/)
            .map((para) => para.trim())
            .filter(Boolean);
    return finalParas.map((para) => `<p>${para}</p>`).join('');
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState
        message={error || 'Failed to load chapter.'}
        onRetry={() => window.location.reload()}
        className="py-12"
      />
    );
  }
  if (!chapter) {
    return (
      <ErrorState
        message="Chapter not found."
        onRetry={() => window.location.reload()}
        className="py-12"
      />
    );
  }

  return (
    <div className="container mx-auto py-2 max-w-4xl bg-background min-h-screen">
      {/* Pinned Progress Bar - Minimal and always visible */}
      <div className="fixed top-0 left-0 right-0 z-[60] w-full bg-background">
        <div className="h-1 w-full bg-border">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
            title={`${progressPercentage}% complete`}
          />
        </div>
      </div>

      {/* Add top padding to account for pinned bar */}
      <div className="pt-4">
        {/* Back and Chapters Buttons */}
        <div className="mb-3 px-2 flex gap-2">
          <Button
            onClick={goBackToNovel}
            className="group flex items-center gap-2 bg-transparent text-gray-400 hover:text-primary hover:bg-primary/10 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to Novel
          </Button>
          <Button
            onClick={() => setIsChapterListOpen(true)}
            className="flex items-center gap-2 bg-primary/10 border border-primary text-primary hover:text-white hover:bg-primary/20 transition-all duration-200"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Chapters</span>
          </Button>
        </div>

        {/* Chapter Content */}
        <Card className="bg-card border border-border mx-0.5">
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
              className="reader-content max-w-none px-2"
              dangerouslySetInnerHTML={{ __html: preprocessContent(chapter.content) }}
            />
            {tradeError && <div className="text-red-400 mt-4">{tradeError}</div>}

            {/* Navigation with Tip Button */}
            <div className="flex flex-col items-center mt-8 pt-6 border-t border-border">
              <div className="flex justify-between items-center w-full gap-2">
                <Button
                  onClick={goToPrevious}
                  disabled={!previousChapter}
                  className="flex items-center gap-2 bg-transparent border border-primary text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {previousChapter ? 'Previous' : 'First Chapter'}
                </Button>

                {/* Tip Button Section */}
                <div className="flex flex-col items-center mx-2">
                  <Button
                    onClick={handleLove}
                    disabled={hasLoved || tradePending}
                    className={`flex items-center gap-2 bg-primary text-white border border-primary px-4 py-2 rounded-lg shadow-lg transition-all duration-200 ${
                      hasLoved ? 'bg-primary/30 text-primary' : ''
                    }`}
                    aria-label={`Tip this chapter ${tipAmountDisplay} USDC`}
                  >
                    <DollarSign className="h-5 w-5" />
                    <span>{hasLoved ? 'Tipped!' : `Tip ${tipAmountDisplay} USDC`}</span>
                  </Button>
                  <span className="text-xs text-gray-400 mt-1">{tipCount} tips</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Support the author by tipping!
                  </span>
                </div>

                <Button
                  onClick={goToNext}
                  disabled={!nextChapter}
                  className="flex items-center gap-2 bg-transparent border border-primary text-gray-400 hover:text-white hover:bg-white/10"
                >
                  {nextChapter ? 'Next' : 'Last Chapter'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Back Button - Side, vertically centered */}
      <div className="fixed left-1 md:left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 opacity-40 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
        <button
          type="button"
          onClick={goBackToNovel}
          className="bg-card border border-border rounded-full p-2 md:p-3 text-gray-400 hover:text-primary hover:bg-primary/10 active:bg-primary/20 focus:bg-primary/20 focus:outline-none transition-all duration-300 shadow-lg touch-manipulation mb-1"
          aria-label="Back to Novel"
        >
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        </button>
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

      {/* Chapter List Modal */}
      <ChapterListModal
        isOpen={isChapterListOpen}
        onClose={() => setIsChapterListOpen(false)}
        novelId={novelId}
        currentChapterId={chapterId}
      />
    </div>
  );
}

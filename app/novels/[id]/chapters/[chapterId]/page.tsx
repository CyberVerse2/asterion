'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Clock, Heart } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import {
  useReadingProgress,
  useSaveReadingProgress,
  formatReadingProgress,
  getLastReadTimestamp
} from '@/hooks/useReadingProgress';
import LoveAnimation from '@/components/love-animation';

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

export default function IndividualChapterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const novelId = params.id as string;
  const chapterId = params.chapterId as string;
  const startFromTop = searchParams.get('startFromTop') === 'true';

  // Chapter state
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation state
  const [previousChapter, setPreviousChapter] = useState<{ id: string; title: string } | null>(
    null
  );
  const [nextChapter, setNextChapter] = useState<{ id: string; title: string } | null>(null);

  // Reading progress state
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [topVisibleLine, setTopVisibleLine] = useState(0);
  const [bottomVisibleLine, setBottomVisibleLine] = useState(0);
  const [lastSavedLine, setLastSavedLine] = useState(0);

  // Love/tip state
  const [hasLoved, setHasLoved] = useState(false);
  const [loveAnimations, setLoveAnimations] = useState<LoveAnimationState[]>([]);
  const [tipCount, setTipCount] = useState(0);
  const [tradePending, setTradePending] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState(false);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationIdRef = useRef(0);
  const isTrackingRef = useRef(false);

  // Reading progress hooks
  const { readingProgress, mutate: mutateProgress } = useReadingProgress(
    (user as any)?.id,
    chapterId
  );
  const { saveProgress } = useSaveReadingProgress();

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
        setTipCount(chapterData.tipCount || 0);

        // Check if user has already tipped this chapter
        if ((user as any)?.tips) {
          const hasAlreadyTipped = (user as any).tips.some(
            (tip: any) => tip.chapterId === chapterId
          );
          setHasLoved(hasAlreadyTipped);
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
    [chapterId, user]
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

  // Debounced save function - moved up and memoized properly
  const debouncedSave = useCallback(
    (lineIndex: number, totalLinesCount: number) => {
      console.log('💾 debouncedSave called:', {
        lineIndex,
        totalLinesCount,
        userId: (user as any)?.id,
        chapterId,
        hasUser: !!(user as any)?.id,
        hasChapterId: !!chapterId,
        isTracking: isTrackingRef.current,
        timestamp: new Date().toISOString()
      });

      if (saveTimeoutRef.current) {
        console.log('🔄 Clearing previous save timeout');
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        console.log('⏰ Save timeout executed, checking conditions...', {
          hasUserId: !!(user as any)?.id,
          hasChapterId: !!chapterId,
          isTrackingActive: isTrackingRef.current,
          userId: (user as any)?.id,
          chapterId: chapterId
        });

        if ((user as any)?.id && chapterId && isTrackingRef.current) {
          console.log('💾 Actually saving progress:', {
            userId: (user as any).id,
            chapterId: chapterId,
            currentLine: lineIndex,
            totalLines: totalLinesCount,
            scrollPosition: window.scrollY,
            timestamp: new Date().toISOString()
          });

          try {
            const result = await saveProgress({
              userId: (user as any).id,
              chapterId: chapterId,
              currentLine: lineIndex,
              totalLines: totalLinesCount,
              scrollPosition: window.scrollY
            });

            console.log('✅ Progress saved successfully:', result);

            // Invalidate both individual chapter progress and novel-wide progress caches
            mutateProgress();

            // Also invalidate the novel reading progress cache to update "Read Now" button
            if (typeof window !== 'undefined') {
              // Get SWR cache and invalidate novel reading progress
              const { mutate } = await import('swr');
              mutate(`/api/reading-progress?userId=${(user as any).id}&novelId=${novelId}`);
              console.log('🔄 Cache invalidated for novel reading progress');
            }
          } catch (error: any) {
            console.error('❌ Error saving reading progress:', error);
            console.error('📋 Error details:', {
              message: error?.message || String(error),
              stack: error?.stack,
              userId: (user as any).id,
              chapterId,
              lineIndex,
              totalLinesCount
            });
          }
        } else {
          console.log('⚠️ Cannot save - missing data or not tracking:', {
            hasUser: !!(user as any)?.id,
            hasChapterId: !!chapterId,
            isTracking: isTrackingRef.current,
            userId: (user as any)?.id,
            chapterId,
            debugInfo: 'Save conditions not met'
          });
        }
      }, 1000);

      console.log('⏳ Save timeout set for 1 second from now');
    },
    [(user as any)?.id, chapterId, novelId, saveProgress, mutateProgress]
  );

  // Initialize line tracking - fixed to prevent re-initialization loop
  const initializeLineTracking = useCallback(() => {
    if (!contentRef.current || !user || isInitialized) {
      console.log('⏸️ Skipping line tracking init:', {
        hasContent: !!contentRef.current,
        hasUser: !!user,
        isInitialized
      });
      return;
    }

    console.log('🔍 Initializing line tracking for user:', (user as any)?.id);

    const content = contentRef.current;
    const lines = content.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6');

    // Validate that elements have proper dimensions
    let validElements = 0;
    lines.forEach((line, index) => {
      const rect = line.getBoundingClientRect();
      if (rect.height > 0) {
        validElements++;
      }
      if (index < 3) {
        console.log(`📏 Element ${index} dimensions:`, {
          tagName: line.tagName,
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom
        });
      }
    });

    console.log(`📊 Total lines detected: ${lines.length}, Valid elements: ${validElements}`);

    if (validElements === 0) {
      console.log('❌ No valid elements found, aborting initialization');
      return;
    }

    setTotalLines(lines.length);
    setIsInitialized(true);

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Test observer configuration
    const observerConfig = {
      root: null, // Use viewport as root
      rootMargin: '10px', // Small buffer to catch elements just entering/leaving
      threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1.0] // More granular thresholds
    };
    console.log('🎛️ Observer configuration:', observerConfig);

    observerRef.current = new IntersectionObserver((entries) => {
      console.log('🔍 IntersectionObserver callback triggered with', entries.length, 'entries');

      let visibleElements = [];
      let topMostVisible = Infinity;
      let bottomMostVisible = -1;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          const element = entry.target;
          const lineIndex = Array.from(lines).indexOf(element as Element);

          if (lineIndex !== -1) {
            visibleElements.push({
              lineIndex,
              intersectionRatio: entry.intersectionRatio,
              element
            });

            // Track the topmost and bottommost visible elements
            if (lineIndex < topMostVisible) {
              topMostVisible = lineIndex;
            }
            if (lineIndex > bottomMostVisible) {
              bottomMostVisible = lineIndex;
            }
          }
        }
      });

      console.log(
        `👁️ Visible elements: ${visibleElements.length}, Top: ${topMostVisible}, Bottom: ${bottomMostVisible}`
      );

      if (visibleElements.length > 0 && topMostVisible !== Infinity) {
        // Update visible range
        setTopVisibleLine(topMostVisible);
        setBottomVisibleLine(bottomMostVisible);

        // Calculate current reading position (use the middle of visible area)
        const currentReadingLine = Math.floor((topMostVisible + bottomMostVisible) / 2);
        setCurrentLine(currentReadingLine);

        // Check if we should save progress
        if (isTrackingRef.current) {
          const progressDelta = Math.abs(currentReadingLine - lastSavedLine);
          const visibleAreaSize = bottomMostVisible - topMostVisible + 1;
          const saveThreshold = Math.max(5, Math.floor(visibleAreaSize / 2)); // At least 5 lines or half the visible area

          console.log('📊 Progress check:', {
            currentReadingLine,
            lastSavedLine,
            progressDelta,
            saveThreshold,
            shouldSave: progressDelta >= saveThreshold
          });

          if (progressDelta >= saveThreshold) {
            console.log('💾 Triggering save - significant progress detected');
            setLastSavedLine(currentReadingLine);
            debouncedSave(currentReadingLine, lines.length);
          }
        }
      }
    }, observerConfig);

    console.log('🎯 Setting up observer for', lines.length, 'elements');

    // Test first few elements to see their initial positions
    lines.forEach((line, index) => {
      if (index < 5) {
        const rect = line.getBoundingClientRect();
        console.log(`📍 Element ${index} initial position:`, {
          tagName: line.tagName,
          text: line.textContent?.substring(0, 30),
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight
        });
      }
      observerRef.current?.observe(line);
    });

    // Add scroll event listener for debugging
    const handleScroll = () => {
      // Reduced logging frequency - only log every 50th scroll event to reduce spam
      if (Math.random() < 0.02) {
        console.log('📜 Scroll event detected:', {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          documentHeight: document.documentElement.scrollHeight,
          windowHeight: window.innerHeight,
          observerActive: !!observerRef.current
        });
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Cleanup function to remove scroll listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [user, currentLine, debouncedSave, chapterId, isInitialized]);

  // Start tracking after initial delay - fixed timing
  useEffect(() => {
    if (isInitialized && !isTracking) {
      const timer = setTimeout(() => {
        console.log('🚀 Starting reading progress tracking');
        setIsTracking(true);
        isTrackingRef.current = true;
      }, 2000); // Start tracking after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [isInitialized, isTracking]);

  // Restore reading position
  const restoreReadingPosition = useCallback(() => {
    if (!readingProgress || !contentRef.current || startFromTop) return;

    const content = contentRef.current;
    const lines = content.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6');

    if (readingProgress.currentLine < lines.length) {
      const targetLine = lines[readingProgress.currentLine];
      if (targetLine) {
        setTimeout(() => {
          targetLine.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 500);
        setCurrentLine(readingProgress.currentLine);
        setLastSavedLine(readingProgress.currentLine);
      }
    }
  }, [readingProgress, startFromTop]);

  // Love/tip handler
  const handleLove = useCallback(
    async (event?: React.MouseEvent) => {
      if (!chapter || !user) return;

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

      if (!hasLoved) {
        setHasLoved(true);
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
            setTipCount(data.tipCount);
            setTradeSuccess(true);
          } else {
            setHasLoved(false);
            setTradeError(data.error || 'Auto-tip failed. Please try again.');
          }
        } catch (err: any) {
          setHasLoved(false);
          setTradeError(err.message || 'Auto-tip failed');
        }

        setTradePending(false);
      }
    },
    [chapter?.id, hasLoved, user]
  );

  const removeLoveAnimation = useCallback((id: number) => {
    setLoveAnimations((prev) => prev.filter((animation) => animation.id !== id));
  }, []);

  // Navigation handlers
  const goToPrevious = () => {
    if (previousChapter) {
      router.push(`/novels/${novelId}/chapters/${previousChapter.id}`);
    }
  };

  const goToNext = () => {
    if (nextChapter) {
      router.push(`/novels/${novelId}/chapters/${nextChapter.id}?startFromTop=true`);
    }
  };

  const goBackToNovel = () => {
    router.push(`/novels/${novelId}`);
  };

  // Effects
  useEffect(() => {
    fetchChapter();
    fetchNavigation();
  }, [fetchChapter, fetchNavigation]);

  useEffect(() => {
    if (chapter && contentRef.current && !isInitialized) {
      // Wait longer for content to be fully rendered and styled
      const cleanup = setTimeout(() => {
        // Double-check that content still exists and has proper dimensions
        if (contentRef.current) {
          const contentRect = contentRef.current.getBoundingClientRect();
          console.log('📐 Content container dimensions before init:', {
            width: contentRect.width,
            height: contentRect.height,
            top: contentRect.top,
            bottom: contentRect.bottom
          });

          if (contentRect.height > 0) {
            const cleanupFn = initializeLineTracking();

            // Store cleanup function for later
            if (cleanupFn && typeof cleanupFn === 'function') {
              return cleanupFn;
            }
          } else {
            console.log('⚠️ Content not ready yet, retrying...');
            // Retry after another delay if content isn't ready
            setTimeout(() => {
              if (!isInitialized) {
                const retryCleanupFn = initializeLineTracking();
                if (retryCleanupFn && typeof retryCleanupFn === 'function') {
                  return retryCleanupFn;
                }
              }
            }, 1000);
          }
        }
      }, 500); // Increased delay to allow for full rendering

      return () => {
        clearTimeout(cleanup);
      };
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chapter, initializeLineTracking, isInitialized]);

  useEffect(() => {
    if (readingProgress && chapter && contentRef.current) {
      restoreReadingPosition();
    }
  }, [readingProgress, chapter, restoreReadingPosition]);

  // Scroll to top when navigating from next chapter
  useEffect(() => {
    if (startFromTop && chapter) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentLine(0);
    }
  }, [startFromTop, chapter]);

  // Calculate progress percentage
  const progressPercentage = totalLines > 0 ? Math.round((currentLine / totalLines) * 100) : 0;

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          onClick={goBackToNovel}
          className="group flex items-center gap-2 bg-transparent text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Back to Novel
        </Button>
      </div>

      {/* Reading Progress Indicator */}
      {readingProgress && (
        <Card className="mb-6 bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-gray-300">Reading Progress</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{getLastReadTimestamp(readingProgress)}</span>
              </div>
            </div>
            <Progress value={progressPercentage} className="mb-2" />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatReadingProgress(readingProgress)}</span>
              <span>
                Line {currentLine + 1} of {totalLines}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapter Content */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
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
            <div className="flex items-center gap-2 text-gray-400">
              <button
                type="button"
                onClick={handleLove}
                disabled={hasLoved || tradePending}
                className="focus:outline-none"
                aria-label={`Love this chapter ${tipAmountDisplay} USDC`}
              >
                <Heart className={`h-5 w-5 ${hasLoved ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              <span>{tipCount}</span>
            </div>
          </div>
          <div className="text-sm text-gray-400">Chapter {chapter.chapterNumber}</div>
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

      {/* Love Animations */}
      {loveAnimations.map((animation) => (
        <LoveAnimation
          key={animation.id}
          x={animation.x}
          y={animation.y}
          onComplete={() => removeLoveAnimation(animation.id)}
        />
      ))}

      {/* Floating Back to Novel Button */}
      <button
        type="button"
        onClick={goBackToNovel}
        className="fixed left-2 top-1/2 transform -translate-y-1/2 z-50 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-2 sm:p-3 text-gray-400 hover:text-white hover:bg-white/20 transition-all duration-300 shadow-lg md:left-4 touch-manipulation"
        aria-label="Back to Novel"
      >
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </div>
  );
}

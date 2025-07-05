'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const { user } = useUser();
  
  const novelId = params.id as string;
  const chapterId = params.chapterId as string;

  // Chapter state
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation state
  const [previousChapter, setPreviousChapter] = useState<{ id: string; title: string } | null>(null);
  const [nextChapter, setNextChapter] = useState<{ id: string; title: string } | null>(null);

  // Reading progress state
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);

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

  // Reading progress hooks
  const { readingProgress, mutate: mutateProgress } = useReadingProgress(user?.id, chapterId);
  const { saveProgress } = useSaveReadingProgress();

  // Get user's chapter tip amount with fallback
  const chapterTipAmount = user?.chapterTipAmount || 0.01;
  const tipAmountDisplay = chapterTipAmount.toFixed(2);

  // Fetch chapter data
  const fetchChapter = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/chapters/${chapterId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chapter');
      }

      const chapterData = await response.json();
      setChapter(chapterData);
      setTipCount(chapterData.tipCount || 0);

      // Check if user has already tipped this chapter
      if (user?.tips) {
        const hasAlreadyTipped = user.tips.some((tip: any) => tip.chapterId === chapterId);
        setHasLoved(hasAlreadyTipped);
      }

    } catch (err) {
      console.error('Error fetching chapter:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  }, [chapterId, user?.tips]);

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

  // Initialize line tracking
  const initializeLineTracking = useCallback(() => {
    if (!contentRef.current) return;

    const content = contentRef.current;
    const lines = content.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6');
    setTotalLines(lines.length);

    // Set up intersection observer for line tracking
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const lineIndex = Array.from(lines).indexOf(entry.target as Element);
            if (lineIndex !== -1) {
              setCurrentLine(lineIndex);

              // Throttle saving to avoid too many API calls
              const now = Date.now();
              if (now - lastSaveTime > 2000) {
                debouncedSave(lineIndex, lines.length);
                setLastSaveTime(now);
              }
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-50% 0px -50% 0px'
      }
    );

    lines.forEach((line) => {
      observerRef.current?.observe(line);
    });

    setIsTracking(true);
  }, [lastSaveTime]);

  // Debounced save function
  const debouncedSave = useCallback(
    (lineIndex: number, totalLinesCount: number) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (user?.id && chapterId) {
          try {
            await saveProgress({
              userId: user.id,
              chapterId: chapterId,
              currentLine: lineIndex,
              totalLines: totalLinesCount,
              scrollPosition: window.scrollY
            });

            mutateProgress();
          } catch (error) {
            console.error('Error saving reading progress:', error);
          }
        }
      }, 1000);
    },
    [user?.id, chapterId, saveProgress, mutateProgress]
  );

  // Restore reading position
  const restoreReadingPosition = useCallback(() => {
    if (!readingProgress || !contentRef.current) return;

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
      }
    }
  }, [readingProgress]);

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
          if (!user.id) throw new Error('User not logged in');

          const response = await fetch('/api/tip-chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapterId: chapter.id, userId: user.id })
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
      router.push(`/novels/${novelId}/chapters/${nextChapter.id}`);
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
    if (chapter && contentRef.current) {
      setTimeout(() => {
        initializeLineTracking();
      }, 100);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chapter, initializeLineTracking]);

  useEffect(() => {
    if (readingProgress && chapter && contentRef.current) {
      restoreReadingPosition();
    }
  }, [readingProgress, chapter, restoreReadingPosition]);

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
        <h1 className="text-2xl font-bold mb-4 text-white">
          {error || 'Chapter not found'}
        </h1>
        <Button onClick={goBackToNovel} className="bg-purple-600 hover:bg-purple-700">
          Back to Novel
        </Button>
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
          <div className="text-sm text-gray-400">
            Chapter {chapter.chapterNumber}
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={contentRef}
            className="prose prose-lg max-w-none leading-relaxed text-gray-300"
            style={{ lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: chapter.content }}
          />

          {/* Tip feedback */}
          {tradePending && (
            <div className="text-blue-400 mt-4">
              Tipping author ({tipAmountDisplay} USDC) in progress...
            </div>
          )}
          {tradeSuccess && (
            <div className="text-green-400 mt-4">
              Tipped! You automatically sent {tipAmountDisplay} USDC to support the author ❤️
            </div>
          )}
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

            <div className="text-sm text-gray-400 text-center max-w-xs">
              <div className="love-hint">
                Click the ❤️ to love this chapter & tip author ({tipAmountDisplay} USDC)
              </div>
            </div>

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
    </div>
  );
} 
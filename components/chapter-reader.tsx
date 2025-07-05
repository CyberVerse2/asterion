'use client';

import type React from 'react';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
// @ts-ignore
import { Heart, ChevronLeft, ChevronRight, BookOpen, Clock } from 'lucide-react';
import LoveAnimation from './love-animation';
import { USDC_ADDRESS } from '@/lib/abi/SpendPermissionManager';
import { useAccount, useWalletClient, usePublicClient, useConnect, useConnectors } from 'wagmi';
import { Address, Account } from 'viem';
import { useUser } from '@/providers/UserProvider';
import {
  useReadingProgress,
  useSaveReadingProgress,
  formatReadingProgress,
  getLastReadTimestamp
} from '@/hooks/useReadingProgress';

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  tipCount: number;
}

interface ChapterReaderProps {
  chapters: Chapter[];
  currentChapterIndex: number;
  onChapterChange: (index: number) => void;
  onChapterTipped?: (chapterId: string, newTipCount: number) => void;
}

interface LoveAnimationState {
  id: number;
  x: number;
  y: number;
}

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  }
];

export default function ChapterReader({
  chapters,
  currentChapterIndex,
  onChapterChange,
  onChapterTipped
}: ChapterReaderProps) {
  const { user, refreshUser }: { user: any; refreshUser: () => void } = useUser();
  const [tipCount, setTipCount] = useState(chapters[currentChapterIndex]?.tipCount || 0);
  const [hasLoved, setHasLoved] = useState(false);
  const [loveAnimations, setLoveAnimations] = useState<LoveAnimationState[]>([]);
  const animationIdRef = useRef(0);
  const [tradePending, setTradePending] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState(false);

  // Reading progress state
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);

  // Refs for reading progress tracking
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user's chapter tip amount with fallback
  const chapterTipAmount = user?.chapterTipAmount || 0.01;
  const tipAmountDisplay = chapterTipAmount.toFixed(2);

  // Hybrid context: prefer Farcaster miniapp context if present, else Wagmi
  let farcasterAddress: string | undefined = undefined;
  let farcasterSigner: any = undefined;
  if (typeof window !== 'undefined') {
    if ((window as any).farcaster) {
      farcasterAddress =
        (window as any).farcaster.address || (window as any).farcaster.user?.address;
      farcasterSigner = (window as any).farcaster.signer;
    }
  }
  const { address: wagmiAddress } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { connect, connectors, isPending } = useConnect();

  // Use Farcaster context if present, else Wagmi
  const address = farcasterAddress || wagmiAddress;
  const walletClient = farcasterSigner || wagmiWalletClient;

  const currentChapter = chapters[currentChapterIndex];

  // Reading progress hooks
  const { readingProgress, mutate: mutateProgress } = useReadingProgress(
    user?.id,
    currentChapter?.id
  );
  const { saveProgress } = useSaveReadingProgress();

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
              setScrollPosition(window.scrollY);

              // Throttle saving to avoid too many API calls
              const now = Date.now();
              if (now - lastSaveTime > 2000) {
                // Save every 2 seconds at most
                debouncedSave(lineIndex, lines.length);
                setLastSaveTime(now);
              }
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-50% 0px -50% 0px' // Track when line is in the middle of viewport
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
        if (user?.id && currentChapter?.id) {
          try {
            await saveProgress({
              userId: user.id,
              chapterId: currentChapter.id,
              currentLine: lineIndex,
              totalLines: totalLinesCount,
              scrollPosition: window.scrollY
            });

            // Revalidate reading progress
            mutateProgress();
          } catch (error) {
            console.error('Error saving reading progress:', error);
          }
        }
      }, 1000); // Wait 1 second before saving
    },
    [user?.id, currentChapter?.id, saveProgress, mutateProgress]
  );

  // Restore reading position
  const restoreReadingPosition = useCallback(() => {
    if (!readingProgress || !contentRef.current) return;

    const content = contentRef.current;
    const lines = content.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6');

    if (readingProgress.currentLine < lines.length) {
      const targetLine = lines[readingProgress.currentLine];
      if (targetLine) {
        targetLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        setCurrentLine(readingProgress.currentLine);
      }
    }
  }, [readingProgress]);

  // Update tipCount when chapter changes
  useEffect(() => {
    if (currentChapter) {
      setTipCount(currentChapter.tipCount || 0);
      setHasLoved(false); // Reset love state for new chapter
      setTradeSuccess(false);
      setTradeError(null);

      // Check if user has already tipped this chapter
      if (user && user.id) {
        checkIfAlreadyTipped();
      }

      // Initialize line tracking for new chapter
      if (contentRef.current) {
        setTimeout(() => {
          initializeLineTracking();
        }, 100); // Small delay to ensure content is rendered
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentChapter, user, initializeLineTracking]);

  // Restore reading position when reading progress is loaded
  useEffect(() => {
    if (readingProgress && currentChapter && contentRef.current) {
      setTimeout(restoreReadingPosition, 500);
    }
  }, [readingProgress, currentChapter, restoreReadingPosition]);

  const checkIfAlreadyTipped = async () => {
    if (!user || !user.id || !currentChapter) return;

    try {
      // Check user's tip history for this chapter
      const userTips = user.tips || [];
      const hasAlreadyTipped = userTips.some((tip: any) => tip.chapterId === currentChapter.id);
      setHasLoved(hasAlreadyTipped);
    } catch (error) {
      console.error('Error checking tip status:', error);
    }
  };

  const handleLove = useCallback(
    async (event?: React.MouseEvent) => {
      if (event) {
        event.preventDefault();
        // Get click coordinates relative to viewport
        const x = event.clientX;
        const y = event.clientY;
        // Create new love animation
        const newAnimation: LoveAnimationState = {
          id: animationIdRef.current++,
          x,
          y
        };
        setLoveAnimations((prev) => [...prev, newAnimation]);
      }

      // Auto-tip when loving a chapter (only if not already loved)
      if (!hasLoved) {
        // Set hasLoved immediately for instant UI feedback
        setHasLoved(true);
        setTradePending(true);
        setTradeError(null);
        setTradeSuccess(false);

        try {
          if (!user || !user.id) throw new Error('User not logged in');

          // Call backend to automatically tip when loving
          const response = await fetch('/api/tip-chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapterId: currentChapter.id, userId: user.id })
          });

          const data = await response.json();
          if (response.ok && data.status === 'success') {
            setTipCount(data.tipCount);
            setTradeSuccess(true);

            // Refresh user data to update tipping history
            if (refreshUser) {
              await refreshUser();
            }

            // Notify parent component about the tip
            if (onChapterTipped) {
              onChapterTipped(currentChapter.id, data.tipCount);
            }
          } else if (data.error === 'User has not granted spend permission') {
            // Revert hasLoved state on error
            setHasLoved(false);
            setTradeError(
              'Please approve spend permission in your profile before loving chapters.'
            );
          } else if (data.error === 'You have already tipped this chapter') {
            // Keep hasLoved state since they have already tipped
            setHasLoved(true);
            setTradeError('You have already tipped this chapter.');
          } else {
            // Revert hasLoved state on error
            setHasLoved(false);
            setTradeError('Auto-tip failed. Please try again.');
          }
        } catch (err: any) {
          // Revert hasLoved state on error
          setHasLoved(false);
          setTradeError(err.message || 'Auto-tip failed');
        }

        setTradePending(false);
      }
    },
    [currentChapter.id, hasLoved, user, refreshUser, onChapterTipped]
  );

  const removeLoveAnimation = useCallback((id: number) => {
    setLoveAnimations((prev) => prev.filter((animation) => animation.id !== id));
  }, []);

  const goToPrevious = () => {
    if (currentChapterIndex > 0) {
      onChapterChange(currentChapterIndex - 1);
      setHasLoved(false);
    }
  };

  const goToNext = () => {
    if (currentChapterIndex < chapters.length - 1) {
      onChapterChange(currentChapterIndex + 1);
      setHasLoved(false);
    }
  };

  // Auto-connect wallet on mount if not connected
  useEffect(() => {
    if (!address && connectors && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [address, connectors, connect]);

  if (!currentChapter) return null;

  // Calculate progress percentage
  const progressPercentage = totalLines > 0 ? Math.round((currentLine / totalLines) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Reading Progress Indicator */}
      {readingProgress && (
        <Card className="mb-6 novel-card-dark border-white/10">
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

      <Card className="novel-card-dark border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white">{currentChapter.title}</CardTitle>
            <div className="flex items-center gap-2 text-gray-400">
              {address ? (
                <button
                  type="button"
                  onClick={handleLove}
                  disabled={hasLoved}
                  className="focus:outline-none"
                  aria-label={`Love this chapter ${tipAmountDisplay} USDC`}
                >
                  <Heart className={`h-5 w-5 ${hasLoved ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => connect({ connector: connectors[0] })}
                  className="focus:outline-none bg-purple-600 text-white px-3 py-1 rounded"
                  aria-label="Connect Wallet"
                  disabled={isPending}
                >
                  {isPending ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
              <span>{tipCount}</span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Chapter {currentChapter.order} of {chapters.length}
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={contentRef}
            className={`prose prose-lg max-w-none leading-relaxed text-gray-300 chapter-content`}
            style={{
              lineHeight: '1.8'
            }}
            // Only use dangerouslySetInnerHTML if you trust the HTML source
            dangerouslySetInnerHTML={{ __html: currentChapter.content }}
          />

          {/* Tip feedback */}
          {tradePending && (
            <div className="text-blue-400 mt-2">
              Tipping author ({tipAmountDisplay} USDC) in progress...
            </div>
          )}
          {tradeSuccess && (
            <div className="text-green-400 mt-2">
              Tipped! You automatically sent {tipAmountDisplay} USDC to support the author ❤️
            </div>
          )}
          {tradeError && <div className="text-red-400 mt-2">{tradeError}</div>}

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button
              onClick={goToPrevious}
              disabled={currentChapterIndex === 0}
              className="flex items-center gap-2 bg-transparent border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-sm text-gray-400 text-center max-w-xs">
              <div className="love-hint">
                Click the ❤️ to love this chapter & tip author ({tipAmountDisplay} USDC)
              </div>
            </div>

            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button
              onClick={goToNext}
              disabled={currentChapterIndex === chapters.length - 1}
              className="flex items-center gap-2 bg-transparent border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
            >
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

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

export default function IndividualChapterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const novelId = params.id as string;
  const chapterId = params.chapterId as string;
  const startFromTop = searchParams.get('startFromTop') === 'true';
  const shouldRestorePosition = searchParams.get('restore') === 'true';

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
  const lastSavedLineRef = useRef(0);
  const userRef = useRef(user);
  const chapterIdRef = useRef(chapterId);
  const novelIdRef = useRef(novelId);
  const hasRestoredPositionRef = useRef(false);
  const recentTipTimestampRef = useRef<number>(0);

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
    [chapterId, hasLoved] // Removed user dependency, added hasLoved since it's used in the logic
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

  // Save function - now immediate, not debounced
  const saveImmediately = useCallback(
    async (lineIndex: number, totalLinesCount: number) => {
      const currentUser = userRef.current;
      const currentChapterId = chapterIdRef.current;
      const currentNovelId = novelIdRef.current;

      console.log('💾 saveImmediately called:', {
        lineIndex,
        totalLinesCount,
        userId: (currentUser as any)?.id,
        chapterId: currentChapterId,
        novelId: currentNovelId,
        hasUser: !!(currentUser as any)?.id,
        hasChapterId: !!currentChapterId,
        isTracking: isTrackingRef.current,
        userType: currentUser ? 'loaded' : 'not loaded',
        timestamp: new Date().toISOString()
      });

      // Enhanced condition checking with detailed logging
      if (!(currentUser as any)?.id) {
        console.error('❌ Cannot save - User ID not available:', {
          currentUser,
          userFromHook: (user as any)?.id,
          userRef: userRef.current,
          debugInfo: 'User data not loaded or missing ID'
        });
        return;
      }

      if (!currentChapterId) {
        console.error('❌ Cannot save - Chapter ID not available:', {
          currentChapterId,
          chapterIdFromParams: chapterId,
          chapterIdRef: chapterIdRef.current,
          debugInfo: 'Chapter ID not available'
        });
        return;
      }

      if (!isTrackingRef.current) {
        console.error('❌ Cannot save - Tracking not active:', {
          isTrackingRef: isTrackingRef.current,
          isTrackingState: isTracking,
          isInitialized,
          debugInfo: 'Tracking not started yet'
        });
        return;
      }

      // All conditions met, proceed with save
      console.log('✅ All conditions met, proceeding with save:', {
        userId: (currentUser as any).id,
        chapterId: currentChapterId,
        lineIndex,
        totalLinesCount
      });

      try {
        const result = await saveProgress({
          userId: (currentUser as any).id,
          chapterId: currentChapterId,
          currentLine: lineIndex,
          totalLines: totalLinesCount,
          scrollPosition: window.scrollY
        });
        console.log('✅ Progress saved successfully:', result);

        // Update local cache
        mutateProgress();

        // Invalidate novel reading progress cache
        if (typeof window !== 'undefined') {
          const { mutate } = await import('swr');
          mutate(
            `/api/reading-progress?userId=${(currentUser as any).id}&novelId=${currentNovelId}`
          );
          console.log('🔄 Cache invalidated for novel reading progress');
        }
      } catch (error: any) {
        console.error('❌ Error saving reading progress:', error);
        console.error('📋 Error details:', {
          message: error?.message || String(error),
          stack: error?.stack,
          userId: (currentUser as any).id,
          chapterId: currentChapterId,
          lineIndex,
          totalLinesCount,
          requestData: {
            userId: (currentUser as any).id,
            chapterId: currentChapterId,
            currentLine: lineIndex,
            totalLines: totalLinesCount,
            scrollPosition: window.scrollY
          }
        });
      }
    },
    [user, chapterId, novelId, saveProgress, mutateProgress, isTracking, isInitialized]
  );

  // Initialize line tracking - fixed to prevent re-initialization loop
  const initializeLineTracking = useCallback(() => {
    if (!contentRef.current || !user || !(user as any)?.id || isInitialized) {
      console.log('⏸️ Skipping line tracking init:', {
        hasContent: !!contentRef.current,
        hasUser: !!user,
        hasUserId: !!(user as any)?.id,
        isInitialized,
        debugInfo: 'Missing required data for tracking initialization'
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

    // Update refs with current values
    userRef.current = user;
    chapterIdRef.current = chapterId;
    novelIdRef.current = novelId;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Test observer configuration - Updated for better intersection detection
    const observerConfig = {
      root: null, // Use viewport as root
      rootMargin: '50px 0px 50px 0px', // Add some margin to catch elements near viewport edges
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] // More granular thresholds for better detection
    };
    console.log('🎛️ Observer configuration:', observerConfig);

    observerRef.current = new IntersectionObserver((entries) => {
      console.log('🔍 IntersectionObserver callback triggered with', entries.length, 'entries');
      console.log('🔍 Callback context:', {
        isTrackingRef: isTrackingRef.current,
        currentLine,
        lastSavedLine,
        totalLines,
        timestamp: new Date().toISOString()
      });

      // Debug: Log all entries regardless of intersection status
      entries.forEach((entry, index) => {
        if (index < 5) {
          // Only log first 5 to avoid spam
          console.log(`📋 Entry ${index} [${entry.target.tagName}]:`, {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            target: entry.target.tagName,
            text: entry.target.textContent?.substring(0, 30),
            boundingRect: {
              top: entry.boundingClientRect.top,
              bottom: entry.boundingClientRect.bottom,
              height: entry.boundingClientRect.height,
              left: entry.boundingClientRect.left,
              right: entry.boundingClientRect.right,
              width: entry.boundingClientRect.width
            },
            rootBounds: entry.rootBounds,
            intersectionRect: entry.intersectionRect,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            isInViewport:
              entry.boundingClientRect.top >= 0 &&
              entry.boundingClientRect.bottom <= window.innerHeight
          });
        }
      });

      let visibleElements = [];
      let topMostVisible = Infinity;
      let bottomMostVisible = -1;

      entries.forEach((entry, index) => {
        console.log(`📋 Entry ${index}:`, {
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          target: entry.target.tagName,
          boundingRect: {
            top: entry.boundingClientRect.top,
            bottom: entry.boundingClientRect.bottom,
            height: entry.boundingClientRect.height
          }
        });

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

        console.log('📍 Position update:', {
          topMostVisible,
          bottomMostVisible,
          currentReadingLine,
          previousCurrentLine: currentLine
        });

        // Check if we should save progress
        if (isTrackingRef.current) {
          const progressDelta = Math.abs(currentReadingLine - lastSavedLineRef.current);
          const visibleAreaSize = bottomMostVisible - topMostVisible + 1;
          const saveThreshold = Math.max(2, Math.floor(visibleAreaSize / 3)); // Reduced threshold: at least 2 lines or 1/3 of visible area

          console.log('📊 Progress check:', {
            currentReadingLine,
            lastSavedLineFromRef: lastSavedLineRef.current,
            progressDelta,
            saveThreshold,
            visibleAreaSize,
            shouldSave: progressDelta >= saveThreshold,
            isTracking: isTrackingRef.current
          });

          if (progressDelta >= saveThreshold) {
            console.log('💾 Triggering save - significant progress detected');
            setLastSavedLine(currentReadingLine);
            lastSavedLineRef.current = currentReadingLine;
            saveImmediately(currentReadingLine, lines.length);
          } else {
            console.log('⏸️ Not saving - progress delta too small', {
              needed: saveThreshold,
              actual: progressDelta
            });
          }
        } else {
          console.log('⏸️ Not saving - tracking not started yet');
        }
      } else {
        console.log('❌ No visible elements found or invalid range');
      }
    }, observerConfig);

    console.log('🎯 Setting up observer for', lines.length, 'elements');

    // Wait a bit longer for elements to be fully positioned before observing
    setTimeout(() => {
      console.log('⏳ Delayed observer setup - elements should be positioned now');

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
            inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            scrollY: window.scrollY,
            scrollX: window.scrollX
          });
        }
        observerRef.current?.observe(line);
      });

      // Manual test: Check if any elements are actually in viewport
      const elementsInViewport = Array.from(lines).filter((line, index) => {
        const rect = line.getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (index < 10) {
          console.log(`🔍 Manual check - Element ${index}:`, {
            tagName: line.tagName,
            top: rect.top,
            bottom: rect.bottom,
            inViewport,
            viewportHeight: window.innerHeight
          });
        }
        return inViewport;
      });
      console.log(
        `🔍 Manual viewport check: ${elementsInViewport.length} of ${lines.length} elements in viewport`
      );

      // Force initial callback by manually triggering intersection check
      // This ensures the observer fires even for elements already in viewport
      setTimeout(() => {
        console.log('🔄 Forcing initial intersection check...');
        if (observerRef.current) {
          // Temporarily disconnect and reconnect to force initial callbacks
          const currentObserver = observerRef.current;
          lines.forEach((line) => {
            currentObserver.unobserve(line);
            currentObserver.observe(line);
          });
          console.log('✅ Initial intersection check completed');
        }
      }, 500); // Increased delay to ensure elements are fully positioned
    }, 1000); // Wait 1 second before setting up observer

    // Cleanup function
    return () => {
      console.log('🧹 [CLEANUP] initializeLineTracking cleanup running');
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (saveTimeoutRef.current) {
        console.log(
          '🧹 [CLEANUP] Clearing saveTimeoutRef in initializeLineTracking cleanup, ID:',
          saveTimeoutRef.current
        );
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [user, currentLine, saveImmediately, chapterId, isInitialized]);

  // Start tracking after initial delay - fixed timing
  useEffect(() => {
    if (isInitialized && !isTracking && user && (user as any)?.id) {
      console.log('⏰ Setting up tracking timer...');
      console.log('🔧 Pre-tracking validation:', {
        isInitialized,
        isTracking,
        hasUser: !!user,
        userId: (user as any)?.id,
        totalLines,
        chapterId,
        observerActive: !!observerRef.current
      });

      const timer = setTimeout(() => {
        console.log('🚀 Starting reading progress tracking');
        console.log('🔧 Tracking context:', {
          isInitialized,
          totalLines,
          userId: (user as any)?.id,
          chapterId,
          observerActive: !!observerRef.current,
          userRefCurrent: userRef.current,
          chapterIdRefCurrent: chapterIdRef.current
        });

        // Ensure refs are up to date
        userRef.current = user;
        chapterIdRef.current = chapterId;
        novelIdRef.current = novelId;

        setIsTracking(true);
        isTrackingRef.current = true;
        console.log('✅ Tracking started - isTrackingRef.current =', isTrackingRef.current);
      }, 2000); // Start tracking after 2 seconds

      return () => {
        console.log('🧹 Cleaning up tracking timer');
        clearTimeout(timer);
      };
    } else {
      console.log('⏸️ Tracking conditions not met:', {
        isInitialized,
        isTracking,
        hasUser: !!user,
        userId: (user as any)?.id,
        totalLines,
        chapterId
      });
    }
  }, [isInitialized, isTracking, totalLines, user, chapterId, novelId]);

  // Only restore position once per chapter load, after both chapter and readingProgress are available
  useEffect(() => {
    if (
      chapter &&
      readingProgress &&
      !startFromTop &&
      shouldRestorePosition &&
      !hasRestoredPositionRef.current &&
      contentRef.current
    ) {
      console.log('[ScrollRestore] Attempting to restore position:', {
        chapterId,
        currentLine: readingProgress.currentLine,
        totalLines: totalLines,
        hasRestored: hasRestoredPositionRef.current,
        shouldRestorePosition
      });
      const content = contentRef.current;
      const lines = content.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6');
      let attempts = 0;
      const maxAttempts = 20;
      function tryScroll() {
        attempts++;
        if (!readingProgress) {
          console.log('[ScrollRestore] Skipped: readingProgress not loaded (in tryScroll)');
          return;
        }
        if (readingProgress.currentLine < lines.length) {
          const targetLine = lines[readingProgress.currentLine];
          if (targetLine) {
            targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log(
              '[ScrollRestore] Restored to line',
              readingProgress.currentLine,
              'on attempt',
              attempts
            );
            setCurrentLine(readingProgress.currentLine);
            setLastSavedLine(readingProgress.currentLine);
            lastSavedLineRef.current = readingProgress.currentLine;
            hasRestoredPositionRef.current = true;
            return;
          } else {
            console.log('[ScrollRestore] Target line not found on attempt', attempts);
          }
        } else {
          console.log(
            '[ScrollRestore] currentLine out of bounds:',
            readingProgress.currentLine,
            lines.length
          );
        }
        if (attempts < maxAttempts) {
          requestAnimationFrame(tryScroll);
        } else {
          console.log('[ScrollRestore] Max attempts reached, giving up.');
        }
      }
      tryScroll();
    } else {
      if (!chapter) console.log('[ScrollRestore] Skipped: chapter not loaded');
      if (!readingProgress) console.log('[ScrollRestore] Skipped: readingProgress not loaded');
      if (startFromTop) console.log('[ScrollRestore] Skipped: startFromTop is true');
      if (!shouldRestorePosition)
        console.log('[ScrollRestore] Skipped: shouldRestorePosition is false');
      if (hasRestoredPositionRef.current) console.log('[ScrollRestore] Skipped: already restored');
      if (!contentRef.current) console.log('[ScrollRestore] Skipped: contentRef not ready');
    }
  }, [chapter, readingProgress, startFromTop, shouldRestorePosition, totalLines, chapterId]);

  // Reset hasRestoredPositionRef when chapterId changes
  useEffect(() => {
    hasRestoredPositionRef.current = false;
  }, [chapterId]);

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
        if (isTrackingRef.current && currentLine > 0 && totalLines > 0) {
          console.log('📖 Saving progress before navigating to previous chapter');
          await saveImmediately(currentLine, totalLines);
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
        if (isTrackingRef.current && currentLine > 0 && totalLines > 0) {
          console.log('📖 Saving progress before navigating to next chapter');
          await saveImmediately(currentLine, totalLines);
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
        console.log('🧹 [CLEANUP] useEffect cleanup running');
        clearTimeout(cleanup);
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
        if (saveTimeoutRef.current) {
          console.log(
            '🧹 [CLEANUP] Clearing saveTimeoutRef in useEffect cleanup, ID:',
            saveTimeoutRef.current
          );
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }

    return () => {
      console.log('🧹 [CLEANUP] useEffect cleanup running (no chapter/isInitialized)');
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (saveTimeoutRef.current) {
        console.log(
          '🧹 [CLEANUP] Clearing saveTimeoutRef in useEffect cleanup (no chapter/isInitialized), ID:',
          saveTimeoutRef.current
        );
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chapter, initializeLineTracking, isInitialized]);

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
          onClick={handleLove}
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

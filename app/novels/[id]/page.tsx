'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// @ts-ignore
import { DollarSign, BookOpen, ArrowLeft, Star, Library, Eye, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/providers/UserProvider';
import { useNovel, useChapters } from '@/hooks/useNovels';
import { useNovelReadingProgress } from '@/hooks/useReadingProgress';
import { useSpendPermissionGuard } from '@/hooks/use-spend-permission-guard';
import SpendPermissionRequired from '@/components/spend-permission-required';
import useSWR from 'swr';

interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  imageUrl?: string;
  status?: string;
  rank?: string;
  totalTips: number;
  tipCount: number;
  loves: number;
  rating: number;
  chapters: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
    loves: number;
    chapterNumber: number;
  }>;
  supporters: Array<{
    username: string;
    totalTipped: number;
  }>;
  totalChapters?: string;
  views?: string;
  bookmarks?: string;
  genres?: string[];
  summary?: string;
  coin: string;
}

// Utility function for number formatting
const formatNumber = (num: number | string): string => {
  const numValue = typeof num === 'string' ? parseInt(num.replace(/[^0-9]/g, '')) : num;
  if (numValue > 1000000) {
    return (numValue / 1000000).toFixed(1) + 'M';
  } else if (numValue > 1000) {
    return (numValue / 1000).toFixed(1) + 'K';
  }
  return numValue.toLocaleString();
};

// Helper to fetch user profile by username
const fetchUserProfile = async (username: string) => {
  const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`);
  if (!res.ok) return null;
  return res.json();
};

// Helper to fetch user profiles for an array of usernames (batch)
function useSupporterProfilesBatch(usernames: string[]) {
  return useSWR(
    usernames.length > 0 ? ['/api/users/batch', ...usernames] : null,
    async () => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames })
      });
      if (!res.ok) return {};
      const users = await res.json();
      // Map username (lowercase) to profile for easy lookup
      const map: Record<string, any> = {};
      users.forEach((u: any) => {
        if (u.username) map[u.username.toLowerCase()] = u;
      });
      return map;
    },
    { revalidateOnFocus: false }
  );
}

export default function NovelPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const novelId = params.id as string;

  // Use SWR hooks for data fetching
  const { novel, isLoading, error, mutate: mutateNovel } = useNovel(novelId);
  const { chapters, isLoading: chaptersLoading, mutate: mutateChapters } = useChapters(novelId);

  // Fetch user's reading progress for this novel
  const {
    readingProgress,
    isLoading: progressLoading,
    mutate: mutateReadingProgress
  } = useNovelReadingProgress(user?.id || null, novelId);

  // Spend permission guard hook
  const { isModalOpen, checkPermissionAndProceed, closeModal } = useSpendPermissionGuard();

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [summaryHeight, setSummaryHeight] = useState<number | undefined>(undefined);
  const [bookmarking, setBookmarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(() => {
    if (user && user.bookmarks && Array.isArray(user.bookmarks) && novel) {
      return user.bookmarks.includes(novel.id);
    }
    return false;
  });
  const [showChaptersList, setShowChaptersList] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const randomReviews = useMemo(() => Math.floor(Math.random() * 991) + 10, []);
  const stableRating = useMemo(() => (4.0 + Math.random() * 1.0).toFixed(1), []);

  // Memoized formatted numbers
  const formattedStats = useMemo(() => {
    if (!novel) return { chapters: '0', views: '0', bookmarks: '0', reviews: '0' };

    const chaptersNum = Number(novel.totalChapters);
    const chaptersCount =
      !isNaN(chaptersNum) && chaptersNum > 0
        ? chaptersNum
        : Array.isArray(chapters)
        ? chapters.length
        : 0;

    return {
      chapters: formatNumber(chaptersCount),
      views: formatNumber(novel.views || '0'),
      bookmarks: formatNumber(novel.bookmarks || '0'),
      reviews: formatNumber(randomReviews)
    };
  }, [novel, chapters.length, randomReviews]);

  // Calculate continue reading information
  const continueReadingInfo = useMemo(() => {
    if (!readingProgress || !Array.isArray(readingProgress) || !Array.isArray(chapters)) {
      return null;
    }

    // Find the most recently read chapter
    const lastReadProgress = readingProgress
      .filter((progress) => progress.lastReadAt)
      .sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime())[0];

    if (!lastReadProgress) {
      return null;
    }

    // Find the corresponding chapter
    const lastReadChapter = chapters.find((chapter) => chapter.id === lastReadProgress.chapterId);

    if (!lastReadChapter) {
      return null;
    }

    // Check if the chapter is completed (95% or more)
    const isCompleted = lastReadProgress.currentLine / lastReadProgress.totalLines >= 0.95;

    // If completed, suggest next chapter, otherwise continue current chapter
    if (isCompleted) {
      const currentChapterIndex = chapters.findIndex(
        (chapter) => chapter.id === lastReadChapter.id
      );
      const nextChapter = chapters[currentChapterIndex + 1];

      if (nextChapter) {
        const result = {
          chapterId: nextChapter.id,
          chapterTitle: nextChapter.title,
          chapterNumber: nextChapter.chapterNumber,
          chapterIndex: currentChapterIndex + 1,
          isNewChapter: true
        };
        return result;
      }
    }

    // Continue with current chapter
    const chapterIndex = chapters.findIndex((chapter) => chapter.id === lastReadChapter.id);
    const result = {
      chapterId: lastReadChapter.id,
      chapterTitle: lastReadChapter.title,
      chapterNumber: lastReadChapter.chapterNumber,
      chapterIndex: chapterIndex,
      isNewChapter: false,
      progress: lastReadProgress
    };
    return result;
  }, [readingProgress, chapters]);

  // Debug reading progress data
  useEffect(() => {
    if (user?.id && novelId) {
    }
  }, [user?.id, novelId, readingProgress, progressLoading, continueReadingInfo]);

  // Force revalidation when page loads to ensure fresh data
  useEffect(() => {
    if (user?.id && novelId && mutateReadingProgress) {
      mutateReadingProgress();
    }
  }, [user?.id, novelId]);

  // Revalidate reading progress when the page becomes visible (e.g., after returning from a chapter)
  useEffect(() => {
    if (!mutateReadingProgress) return;
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        mutateReadingProgress();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [mutateReadingProgress]);

  // Memoized event handlers
  const handleBookmark = useCallback(async () => {
    if (!user || !user.id || !novel) return alert('You must be logged in to bookmark novels.');
    setBookmarking(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, novelId: novel.id })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to bookmark');
      }
      const updatedUser = await res.json();
      setIsBookmarked(true);
    } catch (err: any) {
      alert(err.message || 'Failed to bookmark');
    } finally {
      setBookmarking(false);
    }
  }, [user, novel]);

  const handleReadNow = useCallback(() => {
    if (!novel) return;

    // Check spend permission before proceeding with reading
    const proceedWithReading = () => {
      // If user has reading progress, navigate to specific chapter with restore parameter
      if (continueReadingInfo) {
        router.push(`/novels/${novelId}/chapters/${continueReadingInfo.chapterId}?restore=true`);
        return;
      }

      // If no reading progress, navigate to the first chapter without restore
      if (chapters && chapters.length > 0) {
        const firstChapter = chapters[0];
        router.push(`/novels/${novelId}/chapters/${firstChapter.id}`);
        return;
      }

      // Do nothing if no chapters available - button should be disabled
    };

    // Use the permission guard to check and proceed
    checkPermissionAndProceed(user, proceedWithReading);
  }, [novel, continueReadingInfo, router, novelId, chapters, user, checkPermissionAndProceed]);

  const handleChapterTipped = useCallback(
    (chapterId: string, newTipCount: number) => {
      // Update chapters data and revalidate
      mutateChapters((currentData: any) => {
        // currentData is the full API response: { chapters: [...], pagination: {...} }
        if (!currentData || !currentData.chapters || !Array.isArray(currentData.chapters)) {
          return currentData;
        }

        return {
          ...currentData,
          chapters: currentData.chapters.map((chapter: any) =>
            chapter.id === chapterId ? { ...chapter, tipCount: newTipCount } : chapter
          )
        };
      }, false);
    },
    [mutateChapters]
  );

  const handleShowChapters = useCallback(() => {
    setShowChaptersList((prev) => !prev);
  }, []);

  const toggleSummary = useCallback(() => {
    setShowSummary((prev) => !prev);
  }, []);

  const handleChaptersNavigation = useCallback(() => {
    router.push(`/novels/${params.id}/chapters`);
  }, [router, params.id]);

  // Toast notification handler
  const showToastNotification = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  // Enhanced share handler with toast feedback
  const handleShare = useCallback(async () => {
    if (!novel) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: novel.title,
          text: `Check out "${novel.title}" by ${novel.author}`,
          url: window.location.href
        });
        showToastNotification('Shared successfully!');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToastNotification('Link copied to clipboard!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        showToastNotification('Failed to share');
      }
    }
  }, [novel, showToastNotification]);

  // Calculate button text
  const readButtonText = useMemo(() => {
    if (chaptersLoading || progressLoading) {
      return 'Loading...';
    }

    if (continueReadingInfo) {
      const chapterLabel = `Chapter ${continueReadingInfo.chapterNumber}`;
      const buttonText = continueReadingInfo.isNewChapter
        ? `Next: ${chapterLabel}`
        : `Continue: ${chapterLabel}`;
      return buttonText;
    }

    return 'READ NOW';
  }, [
    chaptersLoading,
    progressLoading,
    continueReadingInfo,
    readingProgress,
    chapters,
    user?.id,
    novelId
  ]);

  useEffect(() => {
    if (showSummary && summaryRef.current) {
      setSummaryHeight(summaryRef.current.scrollHeight);
    } else {
      setSummaryHeight(undefined);
    }
  }, [showSummary, novel?.summary]);

  useEffect(() => {
    if (user && user.bookmarks && Array.isArray(user.bookmarks) && novel) {
      setIsBookmarked(user.bookmarks.includes(novel.id));
    }
  }, [user, novel?.id]);

  // Fetch top supporter usernames for avatars
  const topSupporters = novel?.supporters?.slice(0, 10) || [];
  const supporterUsernames = topSupporters.map((s: any) => s.username).filter(Boolean);
  const { data: supporterProfiles } = useSupporterProfilesBatch(supporterUsernames);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700/50 rounded mb-4 w-1/3"></div>
          <div className="aspect-[4/3] bg-gray-700/50 rounded-lg mb-6 w-full mx-auto"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-700/50 rounded"></div>
            <div className="h-4 bg-gray-700/50 rounded w-2/3 mx-auto"></div>
            <div className="h-20 bg-gray-700/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-white">
          {error ? 'Error loading novel' : 'Novel not found'}
        </h1>
        {error && <p className="text-red-400 mb-4">{error.message}</p>}
        <Link href="/">
          <Button className="bg-purple-600 hover:bg-purple-700 transition-colors">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 lg:pt-8 bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column - Cover Image and Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover Image - Full Height */}
          <div className="relative w-full overflow-hidden group rounded-lg">
            {/* Back Button Overlay */}
            <Link
              href="/"
              className="absolute top-4 left-4 z-10 group/back inline-flex items-center justify-center w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full text-gray-300 hover:text-white hover:bg-black/70 transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover/back:-translate-x-0.5" />
            </Link>

            <Image
              src={novel.imageUrl || '/placeholder.svg?height=600&width=450'}
              alt={novel.title}
              width={600}
              height={900}
              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105 lg:aspect-[3/4] aspect-[4/3]"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />

            {/* Bottom overlay with enhanced gradient - seamless blend */}
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-1 transition-all duration-300"
              style={{ background: 'linear-gradient(to top, #08080b 0%, transparent 100%)' }}
            >
              {/* Status and Rank badges */}
              <div className="flex items-center gap-2 mb-3">
                <Badge className="text-xs px-2 py-0.5 rounded border-2 border-primary text-primary bg-transparent font-bold tracking-wide shadow-sm">
                  RANK {novel.rank}
                </Badge>
                <Badge className="text-xs px-2 py-0.5 rounded border-2 border-primary text-primary bg-transparent font-bold tracking-wide shadow-sm">
                  {novel.status?.toUpperCase()}
                </Badge>
              </div>

              {/* Title and Author */}
              <div className="mb-3">
                <h1 className="font-bold text-2xl mb-1 text-white group-hover:text-purple-200 transition-colors duration-300">
                  {novel.title}
                </h1>
                <p className="text-sm text-gray-400 mb-2">by {novel.author}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  {[...Array(4)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-all duration-300 group-hover:fill-yellow-300 group-hover:text-yellow-300"
                    />
                  ))}
                  <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400 transition-all duration-300 group-hover:fill-yellow-300/50 group-hover:text-yellow-300" />
                </div>
                <span className="text-sm text-gray-300">({stableRating})</span>
              </div>
            </div>
          </div>

          {/* Stats Section - Under the image */}
          <div className="bg-card shadow-2xl rounded-lg p-6 border border-border">
            <div className="grid grid-cols-4 gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium text-white">
                    {formattedStats.chapters}
                  </span>
                </div>
                <span className="text-xs text-gray-400">Chapters</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium text-white">{formattedStats.views}</span>
                </div>
                <span className="text-xs text-gray-400">Views</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Library className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium text-white">
                    {formattedStats.bookmarks}
                  </span>
                </div>
                <span className="text-xs text-gray-400">Library</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium text-white">{formattedStats.reviews}</span>
                </div>
                <span className="text-xs text-gray-400">Reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Synopsis */}
          <div className="bg-card rounded-lg px-3 py-1 border border-border">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-semibold text-base">Synopsis</h3>
              <Button
                className="bg-transparent text-sm text-gray-400 hover:text-white hover:bg-white/10 p-2 pr-0 transition-all duration-200"
                onClick={toggleSummary}
              >
                {showSummary ? 'LESS ↑' : 'MORE →'}
              </Button>
            </div>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                showSummary ? 'max-h-[500px]' : 'max-h-[4.5rem] lg:max-h-none'
              }`}
            >
              <p className="text-gray-300 text-sm leading-relaxed">{novel.summary}</p>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-lg">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {(novel.genres || []).map((category: string) => (
                <Link
                  key={category}
                  href={`/ranking?genre=${encodeURIComponent(category)}&sort=genre`}
                  className="no-underline"
                >
                  <Badge className="bg-card text-primary border border-border text-xs px-4 py-2 hover:bg-primary/10 transition-all duration-200 cursor-pointer font-normal">
                    {category}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Supporters */}
          {Array.isArray(novel.supporters) && novel.supporters.length > 0 && (
            <section className="mt-6">
              <h3 className="text-white font-semibold mb-3 text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Top Tippers
              </h3>
              <div className="flex flex-wrap gap-2">
                {topSupporters.map((supporter: any, index: number) => {
                  const pfpUrl = supporterProfiles?.[supporter.username?.toLowerCase()]?.pfpUrl;
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-white text-xs font-medium ${
                        index === 0 ? 'border-primary bg-primary/20 text-primary' : ''
                      }`}
                    >
                      {/* Animated, gradient, glowing star for top tipper */}
                      {index === 0 && (
                        <svg
                          className="w-4 h-4 mr-1 animate-bounce"
                          viewBox="0 0 20 20"
                          fill="url(#gold-gradient)"
                          style={{ filter: 'drop-shadow(0 0 6px #facc15)' }}
                        >
                          <defs>
                            <linearGradient id="gold-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fffbe6" />
                              <stop offset="50%" stopColor="#facc15" />
                              <stop offset="100%" stopColor="#b45309" />
                            </linearGradient>
                          </defs>
                          <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.955L10 0l2.951 5.955 6.561.955-4.756 4.635 1.122 6.545z" />
                        </svg>
                      )}
                      {/* Avatar or fallback */}
                      {pfpUrl ? (
                        <img
                          src={pfpUrl}
                          alt={supporter.username}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold uppercase">
                          {supporter.username?.[0] || '?'}
                        </div>
                      )}
                      <span>{supporter.username}</span>
                      <span className="ml-1 text-purple-300 font-bold">
                        ${supporter.totalTipped.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Spacer for sticky bar */}
      <div className="pb-24"></div>

      {/* Enhanced Sticky Action Bar with Glass Morphism */}
      <div className="fixed bottom-0 left-0 w-full z-20 bg-card border-t border-border shadow-2xl px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto">
          {/* Single Row Layout */}
          <div className="grid grid-cols-5 gap-3">
            {/* READ NOW Button - Takes 2 columns */}
            <Button
              className="col-span-2 relative overflow-hidden bg-purple-600 hover:bg-purple-700 text-white border-0 py-4 sm:py-5 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-purple-500/25 group touch-manipulation"
              onClick={handleReadNow}
              disabled={chaptersLoading || progressLoading}
            >
              <div className="relative flex flex-col items-center justify-center gap-1">
                <span className="text-xs sm:text-sm font-bold text-center">{readButtonText}</span>
              </div>
            </Button>

            {/* Library Button */}
            <Button
              className={`relative overflow-hidden py-4 sm:py-5 transition-all duration-300 hover:scale-[1.02] shadow-md group touch-manipulation ${
                isBookmarked
                  ? 'bg-purple-700/30 border-purple-400/50 text-purple-300 hover:bg-purple-700/40'
                  : 'bg-white/10 border-white/20 text-gray-300 hover:text-white hover:bg-white/20 hover:border-white/30'
              }`}
              onClick={handleBookmark}
              disabled={isBookmarked || bookmarking}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                {isBookmarked ? (
                  <svg
                    className="h-10 w-10 sm:h-14 sm:w-14 transition-all duration-300 text-purple-400 fill-current"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                  </svg>
                ) : (
                  <svg
                    className="h-10 w-10 sm:h-14 sm:w-14 transition-transform duration-300 group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"
                    />
                  </svg>
                )}
                <span className="text-xs sm:text-sm font-medium">
                  {/* {isBookmarked ? 'In Library' : bookmarking ? 'Saving...' : 'Library'} */}
                </span>
              </div>
            </Button>

            {/* Chapters Button */}
            <Button
              className="relative overflow-hidden bg-white/10 border-white/20 text-gray-300 hover:text-white hover:bg-white/20 hover:border-white/30 py-4 sm:py-5 transition-all duration-300 hover:scale-[1.02] shadow-md group touch-manipulation"
              onClick={handleChaptersNavigation}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <BookOpen className="h-10 w-10 sm:h-14 sm:w-14 transition-transform duration-300 group-hover:scale-110" />
                {/* <span className="text-xs sm:text-sm font-medium">Chapters</span> */}
              </div>
            </Button>

            {/* Share Button */}
            <Button
              className="relative overflow-hidden bg-white/10 border-white/20 text-gray-300 hover:text-white hover:bg-white/20 hover:border-white/30 py-4 sm:py-5 transition-all duration-300 hover:scale-[1.02] shadow-md group touch-manipulation"
              onClick={handleShare}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <svg
                  className="h-10 w-10 sm:h-14 sm:w-14 transition-transform duration-300 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                {/* <span className="text-xs sm:text-sm font-medium">Share</span> */}
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-purple-700/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg border border-purple-500/20">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Spend Permission Modal */}
      <SpendPermissionRequired
        isOpen={isModalOpen}
        onClose={closeModal}
        user={user}
        onApproveClick={() => {
          closeModal();
          router.push('/profile#spend-permission');
        }}
      />
    </div>
  );
}

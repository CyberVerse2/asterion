'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChapterReader from '@/components/chapter-reader';
// @ts-ignore
import { DollarSign, BookOpen, ArrowLeft, Star, Library, Eye, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/providers/UserProvider';

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

export default function NovelPage() {
  const params = useParams();
  const router = useRouter();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const { user }: { user: any } = useUser();
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

  const randomReviews = useMemo(() => Math.floor(Math.random() * 991) + 10, []);
  const stableRating = useMemo(() => (4.0 + Math.random() * 1.0).toFixed(1), []);

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const response = await fetch(`/api/novels/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setNovel(data);
        }
      } catch (error) {
        console.error('Error fetching novel:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) {
      fetchNovel();
    }
  }, [params.id]);

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
  }, [user, novel && novel.id]);

  const handleBookmark = async () => {
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
      // Optionally update user context here if needed
    } catch (err: any) {
      alert(err.message || 'Failed to bookmark');
    } finally {
      setBookmarking(false);
    }
  };

  const handleReadNow = async () => {
    setChaptersLoading(true);
    try {
      if (!novel) return;
      const chaptersRes = await fetch(`/api/chapters?novelId=${novel.id}`);
      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData);
        setIsReading(true);
      } else {
        setChapters([]);
      }
    } catch (error) {
      setChapters([]);
      console.error('Error fetching chapters:', error);
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleChapterTipped = (chapterId: string, newTipCount: number) => {
    // Update the chapters state with new tip count
    setChapters((prevChapters) =>
      prevChapters.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, tipCount: newTipCount } : chapter
      )
    );
  };

  // Fetch chapters if not loaded when expanding the list
  const handleShowChapters = async () => {
    if (!showChaptersList && chapters.length === 0 && novel) {
      setChaptersLoading(true);
      try {
        const chaptersRes = await fetch(`/api/chapters?novelId=${novel.id}`);
        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          setChapters(chaptersData);
        } else {
          setChapters([]);
        }
      } catch (error) {
        setChapters([]);
        console.error('Error fetching chapters:', error);
      } finally {
        setChaptersLoading(false);
      }
    }
    setShowChaptersList((prev) => !prev);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700/50 rounded mb-4 w-1/3"></div>
          <div className="aspect-[3/4] bg-gray-700/50 rounded-lg mb-6 w-full mx-auto"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-700/50 rounded"></div>
            <div className="h-4 bg-gray-700/50 rounded w-2/3 mx-auto"></div>
            <div className="h-20 bg-gray-700/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-white">Novel not found</h1>
        <Link href="/">
          <Button className="bg-purple-600 hover:bg-purple-700 transition-colors">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  if (isReading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            onClick={() => setIsReading(false)}
            className="group flex items-center gap-2 bg-transparent text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to Novel
          </Button>
        </div>
        <ChapterReader
          chapters={Array.isArray(chapters) ? chapters : []}
          currentChapterIndex={currentChapterIndex}
          onChapterChange={setCurrentChapterIndex}
          onChapterTipped={handleChapterTipped}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Link
        href="/"
        className="group inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-all duration-300 hover:scale-105"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
        <span className="font-medium">Back</span>
      </Link>

      <div className="space-y-6">
        {/* Novel Cover with Overlay Content - Seamless blend */}
        <div className="relative aspect-[3/4] w-full overflow-hidden group -mx-4">
          <Image
            src={novel.imageUrl || '/placeholder.svg?height=600&width=450'}
            alt={novel.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Bottom overlay with enhanced gradient - seamless blend */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent px-8 py-6 transition-all duration-300 group-hover:from-black group-hover:via-black/80">
            {/* Status and Rank badges */}
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-red-600/90 backdrop-blur-sm text-white border-0 text-xs px-3 py-1 rounded-full">
                RANK {novel.rank}
              </Badge>
              <Badge className="bg-green-600/90 backdrop-blur-sm text-white border-0 text-xs px-3 py-1 rounded-full">
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

            {/* Summary */}
            <p className="text-sm text-gray-300 line-clamp-3 mb-2 group-hover:text-gray-200 transition-colors duration-300">
              {novel.description}
            </p>

            {/* Stats with better spacing - Same as Novel Card */}
            <div className="flex flex-row gap-6 mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1">
                <BookOpen className="h-5 w-5 text-gray-300 transition-all duration-300 group-hover:text-purple-300 group-hover:drop-shadow-sm" />
                <span className="text-base font-medium text-white">
                  {(() => {
                    const chaptersNum = Number(novel.totalChapters);
                    if (!isNaN(chaptersNum) && chaptersNum > 0) {
                      return chaptersNum > 1000
                        ? (chaptersNum / 1000).toFixed(1) + 'K'
                        : chaptersNum;
                    }
                    const chaptersCount = Array.isArray(chapters) ? chapters.length : 0;
                    if (chaptersCount > 0) {
                      return chaptersCount > 1000
                        ? (chaptersCount / 1000).toFixed(1) + 'K'
                        : chaptersCount;
                    }
                    return '0';
                  })()}
                </span>
                {/* <span className="text-xs text-gray-400">chapters</span> */}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-5 w-5 text-gray-300 transition-all duration-300 group-hover:text-purple-300 group-hover:drop-shadow-sm" />
                <span className="text-base font-medium text-white">{novel.views || '0'}</span>
                {/* <span className="text-xs text-gray-400">views</span> */}
              </div>
              <div className="flex items-center gap-1">
                <Library className="h-5 w-5 text-gray-300 transition-all duration-300 group-hover:text-purple-300 group-hover:drop-shadow-sm" />
                <span className="text-base font-medium text-white">{novel.bookmarks || '0'}</span>
                {/* <span className="text-xs text-gray-400">in library</span> */}
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-5 w-5 text-gray-300 transition-all duration-300 group-hover:text-purple-300 group-hover:drop-shadow-sm" />
                <span className="text-base font-medium text-white">{randomReviews}</span>
                {/* <span className="text-xs text-gray-400">reviews</span> */}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Categories with Glass Morphism */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-lg">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {(novel.genres || []).map((category: string) => (
              <Badge
                key={category}
                className="bg-white/10 backdrop-blur-md text-white border-0 text-sm px-4 py-2 hover:bg-white/20 transition-all duration-200 cursor-pointer"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Enhanced Synopsis with Glass Morphism */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Synopsis</h3>
            <Button
              className="bg-transparent text-gray-400 hover:text-white hover:bg-white/10 p-2 transition-all duration-200"
              onClick={() => setShowSummary((prev) => !prev)}
            >
              {showSummary ? 'LESS ↑' : 'MORE →'}
            </Button>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <p className="text-gray-300 text-base leading-relaxed">{novel.description}</p>
            {novel.summary && (
              <div
                className="overflow-hidden transition-all duration-500 ease-in-out"
                style={{
                  maxHeight: showSummary ? (summaryHeight ? summaryHeight + 32 : 500) : 0,
                  marginTop: showSummary ? '16px' : '0'
                }}
              >
                <div
                  ref={summaryRef}
                  className="text-gray-200 text-base leading-relaxed pt-4 border-t border-white/10"
                >
                  {novel.summary}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Top Supporters with Glass Morphism */}
        {Array.isArray(novel.supporters) && novel.supporters.length > 0 && (
          <Card className="novel-card-dark border-purple-400/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                Top Supporters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {novel.supporters.map((supporter, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  >
                    <span className="font-medium text-white">{supporter.username}</span>
                    <div className="text-right">
                      <div className="font-medium text-purple-400">
                        ${supporter.totalTipped.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spacer for sticky bar */}
        <div className="pb-24"></div>

        {/* Enhanced Sticky Action Bar with Glass Morphism */}
        <div className="fixed bottom-0 left-0 w-full z-20 bg-black/90 backdrop-blur-xl border-t border-white/20 shadow-2xl px-4 py-4">
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-3 gap-3">
              {/* READ NOW Button */}
              <Button
                className="flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 border-purple-600 py-4 transition-all duration-200 hover:scale-105 shadow-lg"
                onClick={handleReadNow}
                disabled={chaptersLoading}
              >
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {chaptersLoading ? 'Loading...' : 'READ NOW'}
                </span>
              </Button>

              {/* Library Button */}
              <Button
                className={`flex items-center justify-center gap-2 py-4 transition-all duration-200 hover:scale-105 shadow-lg ${
                  isBookmarked
                    ? 'bg-green-600/20 border-green-400 text-green-400'
                    : 'bg-white/10 border-white/20 text-gray-400 hover:text-white hover:bg-white/20'
                }`}
                onClick={handleBookmark}
                disabled={isBookmarked || bookmarking}
              >
                <Library className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {isBookmarked ? 'Saved' : bookmarking ? 'Saving...' : 'Library'}
                </span>
              </Button>

              {/* Chapters Button */}
              <Button
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/20 bg-white/10 border-white/20 py-4 transition-all duration-200 hover:scale-105 shadow-lg"
                onClick={() => router.push(`/novels/${params.id}/chapters`)}
              >
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium">Chapters</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

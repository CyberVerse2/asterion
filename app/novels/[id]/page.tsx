'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChapterReader from '@/components/chapter-reader';
// @ts-ignore
import { DollarSign, BookOpen, ArrowLeft, Star, Library } from 'lucide-react';
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

  const randomReviews = useMemo(() => Math.floor(Math.random() * 991) + 10, []);

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
      alert('Bookmarked!');
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="aspect-[3/4] bg-gray-700 rounded-lg mb-6"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
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
          <Button className="bg-purple-600 hover:bg-purple-700">Back to Home</Button>
        </Link>
      </div>
    );
  }

  if (isReading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          {/* @ts-ignore: variant is supported by ButtonProps */}
          <Button
            onClick={() => setIsReading(false)}
            className="flex items-center gap-2 bg-transparent text-gray-400 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
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

  const rating = (4.0 + Math.random() * 1.0).toFixed(1);

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="space-y-6">
        {/* Novel Cover and Basic Info */}
        <div className="text-center space-y-4">
          <div className="relative aspect-[3/4] w-48 mx-auto">
            <Image
              src={novel.imageUrl || '/placeholder.svg?height=600&width=450'}
              alt={novel.title}
              fill
              className="object-cover rounded-lg"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-600 text-white border-0 text-xs">
                {novel.status?.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">{novel.title}</h1>
            <p className="text-gray-400">Author: {novel.author}</p>

            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-red-600 text-white border-0 text-xs">RANK {novel.rank}</Badge>
              <div className="flex items-center gap-1">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />
              </div>
              <span className="text-sm text-gray-400">({rating})</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-card rounded-xl p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">
                {(() => {
                  const chaptersNum = Number(novel.totalChapters);
                  if (!isNaN(chaptersNum) && chaptersNum > 0) {
                    return (chaptersNum / 1000).toFixed(2) + 'K';
                  }
                  // fallback to chapters array length if available
                  const chaptersCount = Array.isArray(chapters) ? chapters.length : 0;
                  if (chaptersCount > 0) {
                    return (chaptersCount / 1000).toFixed(2) + 'K';
                  }
                  return '0K';
                })()}
              </div>
              <div className="text-xs text-gray-400">CHAPTERS</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{novel.views}</div>
              <div className="text-xs text-gray-400">VIEWS</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{novel.bookmarks}</div>
              <div className="text-xs text-gray-400">IN LIBRARY</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{randomReviews}</div>
              <div className="text-xs text-gray-400">REVIEWS</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-white font-semibold mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {(novel.genres || []).map((category: string) => (
              <span
                key={category}
                className="category-tag px-4 py-2 rounded-full text-sm text-gray-300"
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        {/* Synopsis */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Synopsis</h3>
            {/* @ts-ignore: variant and size are supported by ButtonProps */}
            <Button
              className="bg-transparent text-gray-400 hover:text-white p-0"
              onClick={() => setShowSummary((prev) => !prev)}
            >
              {showSummary ? 'LESS ↑' : 'MORE →'}
            </Button>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{novel.description}</p>
          {novel.summary && (
            <div
              className="mt-2 bg-white/5 rounded text-gray-200 text-sm overflow-hidden transition-all duration-500"
              style={{
                maxHeight: showSummary
                  ? summaryHeight
                    ? summaryHeight + 32 // add padding
                    : 500
                  : 64,
                padding: showSummary ? '12px' : '12px 12px 0 12px'
              }}
              ref={summaryRef}
            >
              {showSummary
                ? novel.summary
                : novel.summary.length > 200
                ? novel.summary.slice(0, 200) + '...'
                : novel.summary}
            </div>
          )}
        </div>

        {/* Recent Tips Section - Prominent Feature */}
        {Array.isArray(novel.supporters) && novel.supporters.length > 0 && (
          <Card className="novel-card-dark border-purple-400/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                Top Supporters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(Array.isArray(novel.supporters) ? novel.supporters : []).map(
                  (supporter, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <span className="font-medium text-white">{supporter.username}</span>
                      <div className="text-right">
                        <div className="font-medium text-purple-400">
                          ${supporter.totalTipped.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pb-32">
          <Button
            onClick={handleReadNow}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium"
            disabled={chaptersLoading}
          >
            {chaptersLoading ? 'Loading...' : 'READ NOW (FIRST TIME)'}
          </Button>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 left-0 w-full z-20 backdrop-blur border-t border-white/10 shadow-2xl px-4 py-3 flex justify-center">
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button
              className={`flex flex-col items-center gap-1 py-4 bg-transparent border-white/20 ${
                isBookmarked ? 'text-green-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              onClick={handleBookmark}
              disabled={isBookmarked || bookmarking}
            >
              <Library className="h-5 w-5" />
              <span className="text-xs">
                {isBookmarked ? 'Bookmarked' : bookmarking ? 'Bookmarking...' : 'Library'}
              </span>
            </Button>
            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white hover:bg-white/10 bg-transparent border-white/20 py-4">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Chapters</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

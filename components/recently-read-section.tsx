'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNovels } from '@/hooks/useNovels';

interface RecentlyReadSectionProps {
  userId: string;
}

interface NovelWithProgress {
  id: string;
  title: string;
  author: string;
  imageUrl?: string;
  totalChapters?: string;
  status?: string;
  chaptersRead: number;
  totalChapters: number;
  lastReadAt: string;
  lastReadChapterId: string;
}

export default function RecentlyReadSection({ userId }: RecentlyReadSectionProps) {
  const [recentlyRead, setRecentlyRead] = useState<NovelWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { novels } = useNovels();

  useEffect(() => {
    const fetchRecentlyRead = async () => {
      if (!userId || !novels) return;

      try {
        console.log('🔍 Fetching recently read for user:', userId);

        // Fetch all reading progress for the user
        const response = await fetch(`/api/reading-progress?userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch reading progress');

        const progressData = await response.json();
        console.log('📚 Progress data received:', progressData);

        if (!Array.isArray(progressData) || progressData.length === 0) {
          console.log('📚 No progress data found');
          setRecentlyRead([]);
          setIsLoading(false);
          return;
        }

        // Group progress by novel and get the highest chapter number read
        const novelProgressMap = new Map<
          string,
          {
            lastReadChapter: number;
            lastReadAt: string;
            lastReadChapterId: string;
            progressEntries: any[];
          }
        >();

        progressData.forEach((progress: any) => {
          const novelId = progress.novelId;
          if (!novelId) return;

          const existing = novelProgressMap.get(novelId);

          // Get chapter number from the chapter data
          const chapterNumber = progress.chapterNumber || 0;

          if (existing) {
            if (chapterNumber > existing.lastReadChapter) {
              existing.lastReadChapter = chapterNumber;
              existing.lastReadChapterId = progress.chapterId;
            }
            if (new Date(progress.lastReadAt) > new Date(existing.lastReadAt)) {
              existing.lastReadAt = progress.lastReadAt;
              // Update chapter ID if this is the most recent read
              if (chapterNumber >= existing.lastReadChapter) {
                existing.lastReadChapterId = progress.chapterId;
              }
            }
            existing.progressEntries.push(progress);
          } else {
            novelProgressMap.set(novelId, {
              lastReadChapter: chapterNumber,
              lastReadAt: progress.lastReadAt,
              lastReadChapterId: progress.chapterId,
              progressEntries: [progress]
            });
          }
        });

        console.log('📚 Novel progress map:', novelProgressMap);

        // Get novel details and combine with progress
        const recentlyReadNovels: NovelWithProgress[] = [];

        for (const [novelId, progressInfo] of novelProgressMap) {
          const novel = novels.find((n: any) => n.id === novelId);
          if (novel) {
            const totalChapters = Number(novel.totalChapters) || novel.chapters?.length || 0;
            recentlyReadNovels.push({
              id: novel.id,
              title: novel.title,
              author: novel.author,
              imageUrl: novel.imageUrl,
              totalChapters: novel.totalChapters,
              status: novel.status,
              chaptersRead: progressInfo.lastReadChapter,
              totalChapters: totalChapters,
              lastReadAt: progressInfo.lastReadAt,
              lastReadChapterId: progressInfo.lastReadChapterId
            });
          }
        }

        console.log('📚 Recently read novels:', recentlyReadNovels);

        // Sort by most recently read
        recentlyReadNovels.sort(
          (a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime()
        );

        // Take only the 4 most recent
        setRecentlyRead(recentlyReadNovels.slice(0, 4));
      } catch (error) {
        console.error('Error fetching recently read:', error);
        setRecentlyRead([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentlyRead();
  }, [userId, novels]);

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Recently Read</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 h-24 sm:h-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentlyRead.length === 0) {
    return null; // Don't show section if no recently read novels
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Recently Read</h2>
        <Link
          href="/profile"
          className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-purple-300 transition-colors text-xs sm:text-sm"
        >
          View All
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {recentlyRead.map((novel) => (
          <Link
            key={novel.id}
            href={`/novels/${novel.id}/chapters/${novel.lastReadChapterId}?restore=true`}
          >
            <Card className="h-full hover:shadow-2xl transition-all duration-300 cursor-pointer novel-card-dark border-white/10 hover:border-purple-400/50 group">
              <CardContent className="p-0">
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <Image
                    src={novel.imageUrl || '/placeholder.svg?height=300&width=200'}
                    alt={novel.title}
                    fill
                    className="object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Progress overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 sm:p-4">
                    <h3 className="font-bold text-sm sm:text-lg mb-1 line-clamp-2 text-white group-hover:text-purple-200 transition-colors duration-300">
                      {novel.title}
                    </h3>
                    <p className="text-xs text-gray-400 mb-1 sm:mb-2">by {novel.author}</p>

                    {/* Reading Progress */}
                    <div className="mb-2 sm:mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300">Progress</span>
                        <span className="text-xs font-medium text-purple-400">
                          Ch.{novel.chaptersRead}/{novel.totalChapters}
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1 sm:h-1.5">
                        <div
                          className="bg-purple-400 h-1 sm:h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              novel.totalChapters > 0
                                ? Math.round((novel.chaptersRead / novel.totalChapters) * 100)
                                : 0
                            }%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Last Read Time */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span className="truncate">
                        {(() => {
                          const now = new Date();
                          const lastRead = new Date(novel.lastReadAt);
                          const diffMs = now.getTime() - lastRead.getTime();
                          const diffMinutes = Math.floor(diffMs / (1000 * 60));
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                          if (diffMinutes < 1) return 'Just now';
                          if (diffMinutes < 60) return `${diffMinutes}m ago`;
                          if (diffHours < 24) return `${diffHours}h ago`;
                          if (diffDays < 7) return `${diffDays}d ago`;
                          return lastRead.toLocaleDateString();
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {novel.status && (
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                      <Badge className="bg-green-600/90 backdrop-blur-sm text-white border-0 text-xs px-1 sm:px-2 py-0.5 sm:py-1">
                        {novel.status.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

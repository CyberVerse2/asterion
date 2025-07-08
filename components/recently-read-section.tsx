'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNovels } from '@/hooks/useNovels';

interface RecentlyReadSectionProps {
  userId: string;
  horizontal?: boolean;
}

interface NovelWithProgress {
  id: string;
  title: string;
  author: string;
  imageUrl?: string;
  totalChapters: number;
  status?: string;
  chaptersRead: number;
  lastReadAt: string;
  lastReadChapterId: string;
}

export default function RecentlyReadSection({ userId, horizontal }: RecentlyReadSectionProps) {
  const [recentlyRead, setRecentlyRead] = useState<NovelWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { novels } = useNovels();

  // Memoize the novels data to prevent unnecessary re-renders
  const novelsMap = useMemo(() => {
    if (!novels) return new Map();
    return new Map(novels.map((novel: any) => [novel.id, novel]));
  }, [novels]);

  useEffect(() => {
    const fetchRecentlyRead = async () => {
      if (!userId || !novelsMap.size) return;

      try {
        // Fetch all reading progress for the user
        const response = await fetch(`/api/reading-progress?userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch reading progress');

        const progressData = await response.json();

        if (!Array.isArray(progressData) || progressData.length === 0) {
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
            // Safely parse dates and handle invalid values
            const progressDate = progress.lastReadAt ? Date.parse(progress.lastReadAt) : NaN;
            const existingDate = existing.lastReadAt ? Date.parse(existing.lastReadAt) : NaN;

            if (!isNaN(progressDate) && (isNaN(existingDate) || progressDate > existingDate)) {
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

        // Get novel details and combine with progress
        const recentlyReadNovels: NovelWithProgress[] = [];

        for (const [novelId, progressInfo] of novelProgressMap) {
          const novel = novelsMap.get(novelId);
          if (novel) {
            const totalChapters = Number(novel.totalChapters) || 0;
            recentlyReadNovels.push({
              id: novel.id,
              title: novel.title,
              author: novel.author,
              imageUrl: novel.imageUrl,
              totalChapters: totalChapters,
              status: novel.status,
              chaptersRead: progressInfo.lastReadChapter,
              lastReadAt: progressInfo.lastReadAt,
              lastReadChapterId: progressInfo.lastReadChapterId
            });
          }
        }

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
  }, [userId, novelsMap]);

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Continue Reading</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div className="animate-pulse">
            <div className="bg-muted rounded-lg p-3 sm:p-4 h-24 sm:h-32"></div>
          </div>
        </div>
      </div>
    );
  }
  if (recentlyRead.length === 0) {
    return null; // Don't show section if no recently read novels
  }

  // Show the two most recent novels
  const novelsToShow = recentlyRead.slice(0, 2);

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Continue Reading</h2>
        <Link
          href="/history"
          className="flex items-center gap-1 sm:gap-2 text-primary hover:text-purple-300 transition-colors text-xs sm:text-sm"
        >
          View History
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Link>
      </div>
      <div
        className={
          horizontal
            ? 'flex gap-4 overflow-x-auto scrollbar-hide pb-2'
            : 'flex justify-center gap-4'
        }
      >
        {novelsToShow.map((novel) => (
          <Link
            key={novel.id}
            href={`/novels/${novel.id}/chapters/${novel.lastReadChapterId}?restore=true`}
            className="w-32 flex-shrink-0"
          >
            <Card className="w-32 h-auto shadow-2xl hover:shadow-2xl transition-all duration-300 cursor-pointer novel-card-dark border-border hover:border-primary/50 group">
              <CardContent className="p-0">
                <div className="relative w-32 h-44 overflow-hidden group rounded-lg mx-auto shadow-2xl">
                  <Image
                    src={novel.imageUrl || '/placeholder.svg?height=600&width=450'}
                    alt={novel.title}
                    width={160}
                    height={224}
                    className="w-32 h-44 object-contain transition-transform duration-300 group-hover:scale-105 bg-black"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                  />
                  {novel.status && (
                    <div className="absolute top-2 right-2 z-20">
                      <Badge className="bg-primary/90 backdrop-blur-sm text-white border-0 text-[10px] px-1.5 py-0.5">
                        {novel.status.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                  {/* Gradient overlay: transparent at bottom, fades to black from 60% upward */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-lg"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(24,24,37,0.92) 0%, transparent 70%)',
                      zIndex: 1
                    }}
                  />
                  {/* Overlay content */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 z-10">
                    <h3
                      className="font-bold text-sm sm:text-lg mb-1 line-clamp-2 text-foreground group-hover:text-purple-200 transition-colors duration-300"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                    >
                      {novel.title}
                    </h3>
                    {/* Reading Progress */}
                    <div className="mb-2 sm:mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs text-muted-foreground"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                        >
                          Progress
                        </span>
                        <span
                          className="text-xs font-medium text-primary"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                        >
                          {novel.chaptersRead}/{novel.totalChapters}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-400 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: (() => {
                              const chaptersRead =
                                typeof novel.chaptersRead === 'number' ? novel.chaptersRead : 0;
                              const totalChapters =
                                typeof novel.totalChapters === 'number' ? novel.totalChapters : 0;
                              if (totalChapters <= 0) return '0%';
                              const percent = Math.min((chaptersRead / totalChapters) * 100, 100);
                              return `${percent}%`;
                            })()
                          }}
                        />
                      </div>
                    </div>
                    {/* Last Read Time */}
                    <div
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                    >
                      <Clock className="h-3 w-3" />
                      <span>
                        {(() => {
                          const lastRead = new Date(
                            typeof novel.lastReadAt === 'object' &&
                            novel.lastReadAt !== null &&
                            '$date' in novel.lastReadAt
                              ? (novel.lastReadAt as { $date: string }).$date
                              : novel.lastReadAt ?? ''
                          );
                          const now = new Date();
                          const diffInHours = Math.floor(
                            (now.getTime() - lastRead.getTime()) / (1000 * 60 * 60)
                          );
                          if (diffInHours < 1) return 'Just now';
                          if (diffInHours < 24) return `${diffInHours}h ago`;
                          if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
                          return lastRead.toLocaleDateString();
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

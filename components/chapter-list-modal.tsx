'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { useChapters } from '@/hooks/useNovels';
import { useRouter } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import { useNovelReadingProgress } from '@/hooks/useReadingProgress';
import { useSpendPermissionGuard } from '@/hooks/use-spend-permission-guard';
import SpendPermissionRequired from '@/components/spend-permission-required';
import { Input } from '@/components/ui/input';

interface ChapterListModalProps {
  isOpen: boolean;
  onClose: () => void;
  novelId: string;
  currentChapterId: string;
}

interface Chapter {
  id: string;
  title: string;
  chapterNumber: number;
}

export default function ChapterListModal({
  isOpen,
  onClose,
  novelId,
  currentChapterId
}: ChapterListModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const { chapters, isLoading } = useChapters(novelId);
  const { readingProgress } = useNovelReadingProgress((user as any)?.id, novelId);

  const [search, setSearch] = useState('');

  // Spend permission guard hook
  const {
    isModalOpen: isPermissionModalOpen,
    checkPermissionAndProceed,
    closeModal: closePermissionModal
  } = useSpendPermissionGuard();

  const handleChapterClick = (chapterId: string) => {
    const proceedWithNavigation = () => {
      router.push(`/novels/${novelId}/chapters/${chapterId}`);
      onClose();
    };

    // Check permission before navigating
    checkPermissionAndProceed(user, proceedWithNavigation);
  };

  const getChapterProgress = (chapterId: string) => {
    if (!readingProgress) return null;
    return readingProgress.find((progress) => progress.chapterId === chapterId);
  };

  const getProgressPercentage = (chapterId: string) => {
    const progress = getChapterProgress(chapterId);
    if (!progress || !progress.totalLines) return 0;
    return Math.round((progress.currentLine / progress.totalLines) * 100);
  };

  const isChapterCompleted = (chapterId: string) => {
    const percentage = getProgressPercentage(chapterId);
    return percentage >= 95;
  };

  const filteredChapters =
    chapters && chapters.length > 0 && search.trim()
      ? chapters.filter(
          (ch: Chapter) =>
            ch.title.toLowerCase().includes(search.toLowerCase()) ||
            String(ch.chapterNumber).includes(search.trim())
        )
      : chapters;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <Card className="bg-gray-900/95 backdrop-blur-sm border-white/10 w-full max-w-sm max-h-[40vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className=" text-lg text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-400" />
            Chapter List
          </CardTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 pb-0">
            <Input
              className="w-full h-11 text-base rounded-lg bg-card border border-border focus:border-purple-400/50 transition-colors px-4 py-3 mb-2"
              placeholder="Search chapters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[30vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                Loading chapters...
              </div>
            ) : filteredChapters && filteredChapters.length > 0 ? (
              <div className="space-y-1 p-4">
                {filteredChapters.map((chapter: Chapter) => {
                  const progress = getChapterProgress(chapter.id);
                  const progressPercentage = getProgressPercentage(chapter.id);
                  const isCompleted = isChapterCompleted(chapter.id);
                  const isCurrent = chapter.id === currentChapterId;

                  return (
                    <button
                      key={chapter.id}
                      onClick={() => handleChapterClick(chapter.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        isCurrent
                          ? 'bg-purple-600/20 border border-purple-500/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-purple-400">
                              Chapter {chapter.chapterNumber}
                            </span>
                            {isCompleted && <CheckCircle className="h-4 w-4 text-green-400" />}
                            {isCurrent && (
                              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                        </div>
                        {progress && (
                          <div className="ml-3 flex-shrink-0">
                            <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No chapters available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spend Permission Required Modal */}
      <SpendPermissionRequired
        isOpen={isPermissionModalOpen}
        onClose={closePermissionModal}
        user={user}
      />
    </div>
  );
}

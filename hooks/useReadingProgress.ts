import useSWR from 'swr';
import { ReadingProgress } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Hook for fetching reading progress for a specific chapter
export const useReadingProgress = (userId: string | null, chapterId: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    userId && chapterId ? `/api/reading-progress?userId=${userId}&chapterId=${chapterId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  );

  return {
    readingProgress: data?.[0] as ReadingProgress | undefined,
    isLoading,
    error,
    mutate
  };
};

// Hook for fetching reading progress for all chapters in a novel
export const useNovelReadingProgress = (userId: string | null, novelId: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    userId && novelId ? `/api/reading-progress?userId=${userId}&novelId=${novelId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  );

  return {
    readingProgress: data as ReadingProgress[] | undefined,
    isLoading,
    error,
    mutate
  };
};

// Hook for saving reading progress
export const useSaveReadingProgress = () => {
  const saveProgress = async (progressData: {
    userId: string;
    chapterId: string;
    currentLine: number;
    totalLines: number;
    scrollPosition?: number;
  }) => {
    const response = await fetch('/api/reading-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(progressData)
    });

    if (!response.ok) {
      throw new Error('Failed to save reading progress');
    }

    return response.json();
  };

  return { saveProgress };
};

// Utility function to format reading progress
export const formatReadingProgress = (progress: ReadingProgress): string => {
  if (!progress) return '0%';

  const percentage = Math.round((progress.currentLine / progress.totalLines) * 100);
  return `${percentage}% complete`;
};

// Utility function to get last read timestamp
export const getLastReadTimestamp = (progress: ReadingProgress): string => {
  if (!progress || !progress.lastReadAt) return 'Never';

  const now = new Date();
  const lastRead = new Date(progress.lastReadAt);
  const diffMs = now.getTime() - lastRead.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hr ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return lastRead.toLocaleDateString();
  }
};

// Utility function to calculate reading time estimate
export const getReadingTimeEstimate = (progress: ReadingProgress): string => {
  if (!progress || progress.currentLine >= progress.totalLines) return 'Finished';

  const remainingLines = progress.totalLines - progress.currentLine;
  const averageWordsPerLine = 12; // Estimate
  const averageReadingSpeed = 200; // Words per minute

  const remainingWords = remainingLines * averageWordsPerLine;
  const estimatedMinutes = Math.ceil(remainingWords / averageReadingSpeed);

  if (estimatedMinutes < 1) {
    return 'Less than 1 min';
  } else if (estimatedMinutes < 60) {
    return `${estimatedMinutes} min left`;
  } else {
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `${hours}h ${minutes}m left`;
  }
};

// Utility function to check if chapter is completed
export const isChapterCompleted = (progress: ReadingProgress): boolean => {
  if (!progress) return false;

  const completionThreshold = 0.95; // 95% completion
  const completionPercentage = progress.currentLine / progress.totalLines;

  return completionPercentage >= completionThreshold;
};

// Utility function to get reading streak
export const getReadingStreak = (progressList: ReadingProgress[]): number => {
  if (!progressList || progressList.length === 0) return 0;

  // Sort by last read date, most recent first
  const sortedProgress = progressList
    .filter((p) => p.lastReadAt)
    .sort((a, b) => new Date(b.lastReadAt!).getTime() - new Date(a.lastReadAt!).getTime());

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const progress of sortedProgress) {
    const readDate = new Date(progress.lastReadAt!);
    readDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - readDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === streak) {
      streak++;
      currentDate = readDate;
    } else {
      break;
    }
  }

  return streak;
};
 
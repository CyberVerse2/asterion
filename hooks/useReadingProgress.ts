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
    progressPercentage?: number;
    scrollPosition?: number;
  }) => {
    try {
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

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving reading progress:', error);
      throw error;
    }
  };

  return { saveProgress };
};

// Utility function to calculate reading progress percentage
export const calculateProgressPercentage = (currentLine: number, totalLines: number): number => {
  if (totalLines === 0) return 0;
  return Math.min(Math.round((currentLine / totalLines) * 100), 100);
};

// Utility function to format reading progress for display
export const formatReadingProgress = (progress: ReadingProgress | undefined): string => {
  if (!progress) return 'Not started';

  if (progress.progressPercentage === 100) {
    return 'Completed';
  }

  if (progress.progressPercentage === 0) {
    return 'Not started';
  }

  return `${progress.progressPercentage}% complete`;
};

// Utility function to get the last read timestamp
export const getLastReadTimestamp = (progress: ReadingProgress | undefined): string => {
  if (!progress) return '';

  const lastRead = new Date(progress.lastReadAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - lastRead.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
};

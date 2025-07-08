"use client"
import useSWR from 'swr';

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });
// Hook for fetching all novels
export const useNovels = () => {
  const { data, error, isLoading, mutate } = useSWR('/api/novels', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false, // Disable auto-revalidation on reconnect for mobile
    dedupingInterval: 300000, // 5 minutes - longer cache for mobile
    errorRetryCount: 2, // Reduce retry count for mobile
    errorRetryInterval: 3000, // Shorter retry interval
    keepPreviousData: true, // Keep previous data while loading new data
    focusThrottleInterval: 5000 // Throttle focus events
  });

  return {
    novels: data || [],
    isLoading,
    error,
    mutate // For manual revalidation
  };
};

// Hook for fetching a single novel
export const useNovel = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/novels/${id}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 600000, // 10 minutes for individual novels
    errorRetryCount: 2,
    errorRetryInterval: 3000,
    keepPreviousData: true
  });

  return {
    novel: data,
    isLoading,
    error,
    mutate
  };
};

// Hook for fetching chapters
export const useChapters = (novelId: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    novelId ? `/api/chapters?novelId=${novelId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      keepPreviousData: true
    }
  );

  return {
    chapters: data?.chapters || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    mutate
  };
};

// Hook for managing user bookmarks
export const useBookmark = (userId: string | null, novelId: string | null) => {
  const bookmark = async (action: 'add' | 'remove') => {
    if (!userId || !novelId) throw new Error('User ID and Novel ID are required');

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, novelId, action })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to bookmark');
    }

    return res.json();
  };

  return { bookmark };
};

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
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute
    errorRetryCount: 3,
    errorRetryInterval: 5000
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
    revalidateOnReconnect: true,
    dedupingInterval: 300000, // 5 minutes for individual novels
    errorRetryCount: 3,
    errorRetryInterval: 5000
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
      revalidateOnReconnect: true,
      dedupingInterval: 180000, // 3 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  );

  return {
    chapters: data || [],
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

'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, RefreshCw, SortAsc, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ChapterListPage() {
  const params = useParams();
  const router = useRouter();
  const [chapters, setChapters] = useState<any[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const fetchChapters = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters?novelId=${params.id}&page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setChapters(data.chapters || []);
        setFilteredChapters(data.chapters || []);
        setPagination(
          data.pagination || {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        );
      } else {
        setChapters([]);
        setFilteredChapters([]);
      }
    } catch {
      setChapters([]);
      setFilteredChapters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters(1);
  }, [params.id]);

  useEffect(() => {
    let filtered = chapters;
    if (search.trim()) {
      filtered = chapters.filter(
        (ch) =>
          ch.title.toLowerCase().includes(search.toLowerCase()) ||
          String(ch.order || ch.number || '').includes(search.trim())
      );
    }
    if (!sortAsc) {
      filtered = [...filtered].reverse();
    }
    setFilteredChapters(filtered);
  }, [search, sortAsc, chapters]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchChapters(newPage);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl bg-background">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/novels/${params.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-xl lg:text-2xl flex-1 truncate">Novel Chapters</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchChapters(pagination.page)}
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setSortAsc((v) => !v)} title="Sort">
          <SortAsc className={`h-5 w-5 transition-transform ${sortAsc ? '' : 'rotate-180'}`} />
        </Button>
      </div>

      <div className="mb-6">
        <input
          className="w-full rounded-lg bg-card border border-border focus:border-purple-400/50 transition-colors"
          placeholder="Search with chapter no or title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Pagination Info */}
      <div className="mb-6 text-center text-sm text-muted-foreground">
        Showing {(pagination.page - 1) * pagination.limit + 1}-
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
        chapters
      </div>

      {loading ? (
        <div className="text-muted-foreground text-center py-12 text-lg">Loading chapters...</div>
      ) : filteredChapters.length === 0 ? (
        <div className="text-muted-foreground text-center py-12 text-lg">No chapters found.</div>
      ) : (
        <div className="space-y-2">
          {filteredChapters.map((chapter, idx) => (
            <div
              key={chapter.id}
              className="flex items-center gap-4 bg-card border border-border rounded-lg shadow-sm px-4 py-2 hover:bg-muted transition-all duration-150"
            >
              <span className="w-10 text-right text-muted-foreground text-sm font-semibold">
                {(pagination.page - 1) * pagination.limit + idx + 1}
              </span>
              <Link
                href={`/novels/${params.id}/chapters/${chapter.id}`}
                className="flex-1 text-foreground hover:text-primary font-medium truncate text-base lg:text-lg"
              >
                {chapter.title}
              </Link>
              <span className="text-sm text-muted-foreground min-w-[100px] text-right">
                {chapter.createdAt
                  ? new Date(chapter.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric'
                    })
                  : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="flex items-center gap-2 px-4 py-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="flex items-center gap-2 px-4 py-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

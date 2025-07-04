'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, RefreshCw, SortAsc } from 'lucide-react';

export default function ChapterListPage() {
  const params = useParams();
  const router = useRouter();
  const [chapters, setChapters] = useState<any[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/chapters?novelId=${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setChapters(data);
          setFilteredChapters(data);
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
    fetchChapters();
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

  return (
    <div className="container mx-auto px-2 py-4 max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/novels/${params.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg flex-1 truncate">Novel Chapters</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.reload()}
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setSortAsc((v) => !v)} title="Sort">
          <SortAsc className={`h-5 w-5 transition-transform ${sortAsc ? '' : 'rotate-180'}`} />
        </Button>
      </div>
      <div className="mb-4">
        <input
          className="w-full rounded bg-gray-800 text-white px-3 py-2 outline-none"
          placeholder="Search with chapter no or title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading chapters...</div>
      ) : filteredChapters.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No chapters found.</div>
      ) : (
        <ul className="divide-y divide-gray-800">
          {filteredChapters.map((chapter, idx) => (
            <li key={chapter.id} className="py-3 flex items-center gap-3">
              <span className="w-8 text-right text-gray-500 text-xs">{idx}</span>
              <Link
                href={`/novels/${params.id}/chapters/${chapter.id}`}
                className="flex-1 text-white hover:text-purple-400 font-medium truncate"
              >
                {chapter.title}
              </Link>
              <span className="text-xs text-gray-500 min-w-[80px] text-right">
                {chapter.createdAt
                  ? new Date(chapter.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric'
                    })
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

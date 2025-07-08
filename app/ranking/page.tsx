import { useNovels } from '@/hooks/useNovels';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function RankingPage() {
  const { novels, isLoading, error } = useNovels();

  if (isLoading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error.message}</div>;
  if (!novels || novels.length === 0)
    return <div className="p-8 text-center text-gray-400">No novels found.</div>;

  // Sort novels by rank (assume lower rank is better)
  const sortedNovels = [...novels].sort(
    (a, b) => (Number(a.rank) || 9999) - (Number(b.rank) || 9999)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-8">Ranking</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedNovels.map((novel) => (
          <Link key={novel.id} href={`/novels/${novel.id}`} className="group">
            <Card className="h-full hover:shadow-2xl transition-all duration-300 cursor-pointer border-white/10 hover:border-purple-400/50 group">
              <CardContent className="p-0">
                <div
                  className="relative w-full overflow-hidden group rounded-lg mb-3"
                  style={{ maxHeight: '30vh' }}
                >
                  <Image
                    src={novel.imageUrl || '/placeholder.svg?height=600&width=450'}
                    alt={novel.title}
                    width={600}
                    height={900}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 lg:aspect-[3/4] aspect-[4/3]"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                  />
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-red-600/90 backdrop-blur-sm text-white border-0 text-xs px-3 py-1 rounded-full">
                      RANK {novel.rank}
                    </Badge>
                  </div>
                  {novel.status && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-green-600/90 backdrop-blur-sm text-white border-0 text-xs px-3 py-1 rounded-full">
                        {novel.status.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="px-3 pb-3">
                  <h3 className="font-bold text-lg mb-1 line-clamp-2 text-white group-hover:text-purple-200 transition-colors duration-300">
                    {novel.title}
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">by {novel.author}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';
// @ts-ignore
import { Heart, Users, Star, BookOpen, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NovelCardProps {
  novel: {
    id: string;
    title: string;
    author: string;
    description: string;
    coverImage?: string;
    imageUrl?: string;
    rank?: string;
    totalTips: number;
    tipCount: number;
    loves: number;
    chapters: { id: string; title: string }[];
    totalChapters?: string;
    views?: string;
    genres?: string[];
    summary?: string;
    status?: string;
  };
}

export default function NovelCard({ novel }: NovelCardProps) {
  const rating = (4.0 + Math.random() * 1.0).toFixed(1);

  return (
    <Link href={`/novels/${novel.id}`}>
      <Card className="h-full hover:shadow-2xl transition-all duration-300 cursor-pointer novel-card-dark border-white/10 hover:border-purple-400/50 flex flex-col group">
        <CardHeader className="p-0">
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            <Image
              src={novel.imageUrl || '/placeholder.svg?height=400&width=300'}
              alt={novel.title}
              fill
              className="object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
            />

            {/* Top badges */}
            <div className="absolute top-2 right-2 z-10">
              <Badge className="bg-green-600/90 backdrop-blur-sm text-white border-0 text-xs">
                {novel.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-red-600/90 backdrop-blur-sm text-white border-0 text-xs">
                RANK {novel.rank}
              </Badge>
            </div>

            {/* Genre tags */}
            {novel.genres && novel.genres.length > 0 && (
              <div className="absolute top-12 left-2 z-10 flex flex-wrap gap-1">
                {novel.genres.slice(0, 3).map((genre, index) => (
                  <Badge
                    key={index}
                    className="bg-white/10 backdrop-blur-md text-white border-0 text-xs px-2 py-1"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Bottom overlay with enhanced gradient */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 rounded-b-lg transition-all duration-300 group-hover:from-black/100 group-hover:via-black/80">
              {/* Title and Author */}
              <div className="mb-3">
                <h3 className="font-bold text-xl mb-1 line-clamp-2 text-white group-hover:text-purple-200 transition-colors duration-300">
                  {novel.title}
                </h3>
                <p className="text-xs text-gray-400 mb-2">by {novel.author}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[...Array(4)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-3 w-3 fill-yellow-400 text-yellow-400 transition-all duration-300 group-hover:fill-yellow-300 group-hover:text-yellow-300"
                    />
                  ))}
                  <Star className="h-3 w-3 fill-yellow-400/50 text-yellow-400 transition-all duration-300 group-hover:fill-yellow-300/50 group-hover:text-yellow-300" />
                </div>
                <span className="text-xs text-gray-300">({rating})</span>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-300 line-clamp-2 mb-3 group-hover:text-gray-200 transition-colors duration-300">
                {novel.summary}
              </p>

              {/* Stats with better spacing */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-gray-300 transition-all duration-300 group-hover:text-purple-300 group-hover:drop-shadow-sm" />
                  <span className="text-xs font-medium text-white">
                    {(() => {
                      const chaptersNum = Number(novel.totalChapters);
                      if (!isNaN(chaptersNum) && chaptersNum > 0) {
                        return (chaptersNum > 1000 ? (chaptersNum / 1000).toFixed(2) + 'K' : chaptersNum);
                      }
                      return '0K';
                    })()}
                  </span>
                  <span className="text-xs text-gray-400">chapters</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-gray-300 transition-all duration-300 group-hover:text-purple-300 group-hover:drop-shadow-sm" />
                  <span className="text-xs font-medium text-white">{novel.views || '0'}</span>
                  <span className="text-xs text-gray-400">views</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

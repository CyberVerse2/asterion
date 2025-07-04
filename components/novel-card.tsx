import Image from 'next/image';
import Link from 'next/link';
// @ts-ignore
import { Heart, Users, Star } from 'lucide-react';
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
      <Card className="h-full hover:shadow-2xl transition-all duration-300 cursor-pointer novel-card-dark border-white/10 hover:border-purple-400/50 flex flex-col">
        <CardHeader className="p-0">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={novel.imageUrl || '/placeholder.svg?height=400&width=300'}
              alt={novel.title}
              fill
              className="object-cover rounded-t-lg"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-600 text-white border-0">
                {novel.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-600 text-white border-0">RANK {novel.rank}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3 flex-grow">
          <div>
            <h3 className="font-bold text-lg mb-1 line-clamp-2 text-white">{novel.title}</h3>
            <p className="text-sm text-gray-400 mb-2">Author: {novel.author}</p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />
              </div>
              <span className="text-sm text-gray-400">({rating})</span>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-card rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">
                  {(() => {
                    const chaptersNum = Number(novel.totalChapters);
                    if (!isNaN(chaptersNum) && chaptersNum > 0) {
                      return (chaptersNum / 1000).toFixed(2) + 'K';
                    }
                    return '0K';
                  })()}
                </div>
                <div className="text-xs text-gray-400">CHAPTERS</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{novel.views || '0'}</div>
                <div className="text-xs text-gray-400">VIEWS</div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {novel.genres?.map((category: string) => (
              <span
                key={category}
                className="category-tag px-3 py-1 rounded-full text-xs text-gray-300"
              >
                {category}
              </span>
            ))}
          </div>

          <p className="text-sm text-gray-400 line-clamp-3">{novel.summary}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
          <div className="w-full">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>{novel.loves}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{novel.tipCount}</span>
                </div>
              </div>
              <div className="text-purple-400 font-medium">
                {(() => {
                  const tipsNum = Number(novel.totalTips);
                  if (!isNaN(tipsNum) && tipsNum > 0) {
                    return `$${tipsNum.toFixed(2)} tipped`;
                  }
                  return '$0.00 tipped';
                })()}
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

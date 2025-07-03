'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChapterReader from '@/components/chapter-reader';
import TipModal from '@/components/tip-modal';
import { DollarSign, BookOpen, ArrowLeft, Star, Library } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/providers/UserProvider';

interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  totalTips: number;
  tipCount: number;
  loves: number;
  chapters: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
    loves: number;
  }>;
  tips: Array<{
    username: string;
    amount: number;
    date: string;
  }>;
}

export default function NovelPage() {
  const params = useParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const response = await fetch(`/api/novels/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setNovel(data);
        }
      } catch (error) {
        console.error('Error fetching novel:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchNovel();
    }
  }, [params.id]);

  const handleTipSuccess = () => {
    if (novel) {
      setNovel({
        ...novel,
        totalTips: novel.totalTips + 1,
        tipCount: novel.tipCount + 1
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="aspect-[3/4] bg-gray-700 rounded-lg mb-6"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-white">Novel not found</h1>
        <Link href="/">
          <Button className="bg-purple-600 hover:bg-purple-700">Back to Home</Button>
        </Link>
      </div>
    );
  }

  if (isReading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setIsReading(false)}
            className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Novel
          </Button>
        </div>
        <ChapterReader
          chapters={novel.chapters}
          currentChapterIndex={currentChapterIndex}
          onChapterChange={setCurrentChapterIndex}
        />
      </div>
    );
  }

  const rating = (4.0 + Math.random() * 1.0).toFixed(1);
  const views = (Math.random() * 50 + 10).toFixed(1) + 'M';
  const inLibrary = (Math.random() * 20 + 5).toFixed(1) + 'K';

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="space-y-6">
        {/* Novel Cover and Basic Info */}
        <div className="text-center space-y-4">
          <div className="relative aspect-[3/4] w-48 mx-auto">
            <Image
              src={novel.coverImage || '/placeholder.svg?height=600&width=450'}
              alt={novel.title}
              fill
              className="object-cover rounded-lg"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-600 text-white border-0 text-xs">COMPLETED</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">{novel.title}</h1>
            <p className="text-gray-400">Author: {novel.author}</p>

            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-red-600 text-white border-0 text-xs">
                RANK {Math.floor(Math.random() * 100) + 1}
              </Badge>
              <div className="flex items-center gap-1">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />
              </div>
              <span className="text-sm text-gray-400">({rating})</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-card rounded-xl p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">
                {(novel.chapters.length / 1000).toFixed(2)}K
              </div>
              <div className="text-xs text-gray-400">CHAPTERS</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{views}</div>
              <div className="text-xs text-gray-400">VIEWS</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{inLibrary}</div>
              <div className="text-xs text-gray-400">IN LIBRARY</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{novel.tipCount}</div>
              <div className="text-xs text-gray-400">REVIEWS</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-white font-semibold mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {['Action', 'Adventure', 'Fantasy', 'Harem', 'Martial Arts', 'Xuanhuan'].map(
              (category) => (
                <span
                  key={category}
                  className="category-tag px-4 py-2 rounded-full text-sm text-gray-300"
                >
                  {category}
                </span>
              )
            )}
          </div>
        </div>

        {/* Synopsis */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Synopsis</h3>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0">
              MORE →
            </Button>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{novel.description}</p>
        </div>

        {/* Recent Tips Section - Prominent Feature */}
        {novel.tips.length > 0 && (
          <Card className="novel-card-dark border-purple-400/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                Recent Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {novel.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <span className="font-medium text-white">{tip.username}</span>
                    <div className="text-right">
                      <div className="font-medium text-purple-400">${tip.amount.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(tip.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => setIsReading(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium"
          >
            READ NOW (FIRST TIME)
          </Button>

          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="ghost"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-white hover:bg-white/10 py-4"
            >
              <Library className="h-5 w-5" />
              <span className="text-xs">Library</span>
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-white hover:bg-white/10 py-4"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Chapters</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowTipModal(true)}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-white hover:bg-white/10 py-4"
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-xs">Tip Author</span>
            </Button>
          </div>
        </div>
      </div>

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        novelId={novel.id}
        novelTitle={novel.title}
        author={novel.author}
        onTipSuccess={handleTipSuccess}
        user={user}
      />
    </div>
  );
}

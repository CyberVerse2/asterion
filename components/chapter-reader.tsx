'use client';

import type React from 'react';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// @ts-ignore
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import LoveAnimation from './love-animation';

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  loves: number;
}

interface ChapterReaderProps {
  chapters: Chapter[];
  currentChapterIndex: number;
  onChapterChange: (index: number) => void;
}

interface LoveAnimationState {
  id: number;
  x: number;
  y: number;
}

export default function ChapterReader({
  chapters,
  currentChapterIndex,
  onChapterChange
}: ChapterReaderProps) {
  const [loves, setLoves] = useState(chapters[currentChapterIndex]?.loves || 0);
  const [hasLoved, setHasLoved] = useState(false);
  const [loveAnimations, setLoveAnimations] = useState<LoveAnimationState[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const animationIdRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout>();

  const currentChapter = chapters[currentChapterIndex];

  const handleDoubleClick = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();

      // Get click coordinates relative to viewport
      const x = event.clientX;
      const y = event.clientY;

      // Create new love animation
      const newAnimation: LoveAnimationState = {
        id: animationIdRef.current++,
        x,
        y
      };

      setLoveAnimations((prev) => [...prev, newAnimation]);

      // Update love count if not already loved
      if (!hasLoved) {
        try {
          const response = await fetch(`/api/chapters/${currentChapter.id}/love`, {
            method: 'POST'
          });

          if (response.ok) {
            const data = await response.json();
            setLoves(data.loves);
            setHasLoved(true);
          }
        } catch (error) {
          console.error('Error loving chapter:', error);
        }
      }
    },
    [currentChapter.id, hasLoved]
  );

  const handleMouseDown = useCallback(() => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // If this is a potential double-click (within 300ms), don't enable text selection
    if (timeSinceLastClick < 300) {
      setIsSelecting(false);
      return;
    }

    // Set a timeout to enable text selection if no second click comes
    clickTimeoutRef.current = setTimeout(() => {
      setIsSelecting(true);
    }, 300);

    lastClickTimeRef.current = now;
  }, []);

  const handleMouseUp = useCallback(() => {
    // Small delay to allow double-click to be processed first
    setTimeout(() => {
      setIsSelecting(true);
    }, 50);
  }, []);

  const removeLoveAnimation = useCallback((id: number) => {
    setLoveAnimations((prev) => prev.filter((animation) => animation.id !== id));
  }, []);

  const goToPrevious = () => {
    if (currentChapterIndex > 0) {
      onChapterChange(currentChapterIndex - 1);
      setHasLoved(false);
      setIsSelecting(false);
    }
  };

  const goToNext = () => {
    if (currentChapterIndex < chapters.length - 1) {
      onChapterChange(currentChapterIndex + 1);
      setHasLoved(false);
      setIsSelecting(false);
    }
  };

  if (!currentChapter) return null;

  return (
    <div className="max-w-4xl mx-auto relative">
      <Card className="novel-card-dark border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white">{currentChapter.title}</CardTitle>
            <div className="flex items-center gap-2 text-gray-400">
              <Heart className={`h-5 w-5 ${hasLoved ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{loves}</span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Chapter {currentChapter.order} of {chapters.length}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`prose prose-lg max-w-none leading-relaxed text-gray-300 chapter-content ${
              isSelecting ? 'selecting' : ''
            }`}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{
              cursor: isSelecting ? 'text' : 'pointer',
              lineHeight: '1.8'
            }}
            // Only use dangerouslySetInnerHTML if you trust the HTML source
            dangerouslySetInnerHTML={{ __html: currentChapter.content }}
          />

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentChapterIndex === 0}
              className="flex items-center gap-2 bg-transparent border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-sm text-gray-400 text-center max-w-xs">
              <div className="double-click-hint">Double-click anywhere to love this chapter ❤️</div>
            </div>

            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button
              variant="outline"
              onClick={goToNext}
              disabled={currentChapterIndex === chapters.length - 1}
              className="flex items-center gap-2 bg-transparent border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Love Animations */}
      {loveAnimations.map((animation) => (
        <LoveAnimation
          key={animation.id}
          x={animation.x}
          y={animation.y}
          onComplete={() => removeLoveAnimation(animation.id)}
        />
      ))}
    </div>
  );
}

'use client';

import type React from 'react';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// @ts-ignore
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import LoveAnimation from './love-animation';
import { USDC_ADDRESS } from '@/lib/abi/SpendPermissionManager';
import { useAccount, useWalletClient, usePublicClient, useConnect, useConnectors } from 'wagmi';
import { Address, Account } from 'viem';
import { useUser } from '@/providers/UserProvider';

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  tipCount: number;
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

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  }
];

export default function ChapterReader({
  chapters,
  currentChapterIndex,
  onChapterChange
}: ChapterReaderProps) {
  const { user }: { user: any } = useUser();
  const [tipCount, setTipCount] = useState(chapters[currentChapterIndex]?.tipCount || 0);
  const [hasLoved, setHasLoved] = useState(false);
  const [loveAnimations, setLoveAnimations] = useState<LoveAnimationState[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const animationIdRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout>();
  const [tradePending, setTradePending] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState(false);
  // Hybrid context: prefer Farcaster miniapp context if present, else Wagmi
  let farcasterAddress: string | undefined = undefined;
  let farcasterSigner: any = undefined;
  if (typeof window !== 'undefined') {
    if ((window as any).farcaster) {
      farcasterAddress =
        (window as any).farcaster.address || (window as any).farcaster.user?.address;
      farcasterSigner = (window as any).farcaster.signer;
    }
  }
  const { address: wagmiAddress } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { connect, connectors, isPending } = useConnect();

  // Use Farcaster context if present, else Wagmi
  const address = farcasterAddress || wagmiAddress;
  const walletClient = farcasterSigner || wagmiWalletClient;

  const currentChapter = chapters[currentChapterIndex];

  const handleLove = useCallback(
    async (event?: React.MouseEvent) => {
      if (event) {
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
      }

      // Auto-tip when loving a chapter (only if not already loved)
      if (!hasLoved) {
        setTradePending(true);
        setTradeError(null);
        setTradeSuccess(false);

        try {
          if (!user || !user.id) throw new Error('User not logged in');

          // Call backend to automatically tip 0.01 USDC when loving
          const response = await fetch('/api/tip-chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapterId: currentChapter.id, userId: user.id })
          });

          const data = await response.json();
          if (response.ok && data.status === 'success') {
            setTipCount(data.tipCount);
            setHasLoved(true);
            setTradeSuccess(true);
          } else if (data.error === 'User has not granted spend permission') {
            setTradeError(
              'Please approve spend permission in your profile before loving chapters.'
            );
          } else {
            setTradeError('Auto-tip failed. Please try again.');
          }
        } catch (err: any) {
          setTradeError(err.message || 'Auto-tip failed');
        }

        setTradePending(false);
      }
    },
    [currentChapter.id, hasLoved, user]
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

  // Auto-connect wallet on mount if not connected
  useEffect(() => {
    if (!address && connectors && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [address, connectors, connect]);

  if (!currentChapter) return null;

  return (
    <div className="max-w-4xl mx-auto relative">
      <Card className="novel-card-dark border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white">{currentChapter.title}</CardTitle>
            <div className="flex items-center gap-2 text-gray-400">
              {address ? (
                <button
                  type="button"
                  onClick={handleLove}
                  disabled={hasLoved}
                  className="focus:outline-none"
                  aria-label="Love this chapter and tip author 0.01 USDC"
                >
                  <Heart className={`h-5 w-5 ${hasLoved ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => connect({ connector: connectors[0] })}
                  className="focus:outline-none bg-purple-600 text-white px-3 py-1 rounded"
                  aria-label="Connect Wallet"
                  disabled={isPending}
                >
                  {isPending ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
              <span>{tipCount}</span>
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
            onDoubleClick={handleLove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{
              cursor: isSelecting ? 'text' : 'pointer',
              lineHeight: '1.8'
            }}
            // Only use dangerouslySetInnerHTML if you trust the HTML source
            dangerouslySetInnerHTML={{ __html: currentChapter.content }}
          />

          {/* Tip feedback */}
          {tradePending && (
            <div className="text-blue-400 mt-2">Tipping author (0.01 USDC) in progress...</div>
          )}
          {tradeSuccess && (
            <div className="text-green-400 mt-2">
              Tipped! You automatically sent 0.01 USDC to support the author ❤️
            </div>
          )}
          {tradeError && <div className="text-red-400 mt-2">{tradeError}</div>}

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button
              onClick={goToPrevious}
              disabled={currentChapterIndex === 0}
              className="flex items-center gap-2 bg-transparent border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-sm text-gray-400 text-center max-w-xs">
              <div className="double-click-hint">
                Double-click anywhere to love this chapter & tip author (0.01 USDC) ❤️
              </div>
            </div>

            {/* @ts-ignore: variant is supported by ButtonProps */}
            <Button
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

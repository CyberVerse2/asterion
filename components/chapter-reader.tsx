'use client';

import type React from 'react';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// @ts-ignore
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import LoveAnimation from './love-animation';
import { tradeCoin } from '@zoralabs/coins-sdk';
import { USDC_ADDRESS } from '@/lib/abi/SpendPermissionManager';
import { useAccount, useWalletClient, usePublicClient, useConnect, useConnectors } from 'wagmi';
import { Address, Account } from 'viem';

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
  coin: string;
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
  onChapterChange,
  coin
}: ChapterReaderProps) {
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
    // Log the window object and farcaster context for debugging
    console.log('window:', window);
    if ((window as any).farcaster) {
      console.log('window.farcaster:', (window as any).farcaster);
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
      // Update tip count only if not already tipped
      if (!hasLoved) {
        setTradePending(true);
        setTradeError(null);
        setTradeSuccess(false);
        try {
          console.log('--- TRADE DEBUG START ---');
          console.log('Using address:', address);
          console.log('Using walletClient:', walletClient);
          console.log('coin:', coin);
          if (!address || !walletClient) throw new Error('Wallet not connected (hybrid context)');
          const spender = process.env.NEXT_PUBLIC_SPENDER_ADDRESS;
          if (!spender) throw new Error('Spender address not set');
          const amount = BigInt(0.1 * 10 ** 6); // 0.1 USDC (6 decimals)
          console.log('Sending USDC tip:', {
            from: address,
            to: spender,
            amount: amount.toString()
          });
          const hash = await walletClient.writeContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [spender, amount],
            account: address
          });
          console.log('USDC transfer tx hash:', hash);
          setTradeSuccess(true);
          // Only after successful trade, call the API to increment tip count
          try {
            console.log('Calling /api/chapters/' + currentChapter.id + '/love');
            const response = await fetch(`/api/chapters/${currentChapter.id}/love`, {
              method: 'POST'
            });
            if (response.ok) {
              const data = await response.json();
              console.log('API response:', data);
              setTipCount(data.tipCount);
              setHasLoved(true);
            } else {
              console.error('Failed to update tip count in backend', response.status);
              setTradeError('Failed to update tip count in backend');
            }
          } catch (apiError) {
            console.error('API error:', apiError);
            setTradeError('Failed to update tip count in backend');
          }
        } catch (err: any) {
          console.error('tradeCoin error:', err);
          if (err?.response) {
            console.error('tradeCoin error response:', err.response);
            if (err.response.data) {
              console.error('tradeCoin error response data:', err.response.data);
            }
          }
          setTradeError(err.message || 'Trade failed');
        }
        console.log('--- TRADE DEBUG END ---');
        setTradePending(false);
      }
    },
    [currentChapter.id, hasLoved, address, walletClient]
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
                  aria-label="Love this chapter"
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

          {/* Trade feedback */}
          {tradePending && <div className="text-blue-400 mt-2">Buying coin (0.1 USDC)...</div>}
          {tradeSuccess && <div className="text-green-400 mt-2">Coin purchased successfully!</div>}
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
              <div className="double-click-hint">Double-click anywhere to love this chapter ❤️</div>
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

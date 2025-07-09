'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';
import type { Novel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import Head from 'next/head';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

export default function PreSaveLanding() {
  const { user } = useUser();
  const { novels, isLoading: novelsLoading, error: novelsError } = useNovels(10);
  const [presaved, setPresaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  // Memoize sortedNovels
  const sortedNovels = useMemo(
    () =>
      ((novels as Novel[]) || [])
        .slice()
        .sort(
          (a: any, b: any) => (Number((a as any).rank) || 9999) - (Number((b as any).rank) || 9999)
        ),
    [novels]
  );

  // Focus the share button when modal opens
  useEffect(() => {
    if (shareModalOpen && shareButtonRef.current) {
      shareButtonRef.current.focus();
    }
  }, [shareModalOpen]);

  async function handlePreSave() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/presave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: !user ? email : undefined,
          userId: user?.id || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to pre-save. Please try again.');
        setLoading(false);
        return;
      }
      setPresaved(true);
      setShareModalOpen(true);
      toast({ title: 'Pre-saved!', description: 'You have joined the waitlist.' });
    } catch (err) {
      setError('Failed to pre-save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied!', description: 'Paste it in Warpcast to share.' });
    } catch (err) {
      toast({ title: 'Copy failed', description: 'Could not copy link.' });
    }
  }

  return (
    <>
      <Head>
        <meta
          name="fc:miniapp"
          content='{"version":"1","imageUrl":"https://v0-asterion-next-js-application.vercel.app/api/og/presave","button":{"title":"🚀 Pre-save Asterion","action":{"type":"launch_miniapp","url":"https://v0-asterion-next-js-application.vercel.app/presave"}}}'
        />
        <meta
          name="fc:frame"
          content='{"version":"1","imageUrl":"https://v0-asterion-next-js-application.vercel.app/api/og/presave","button":{"title":"🚀 Pre-save Asterion","action":{"type":"launch_frame","url":"https://v0-asterion-next-js-application.vercel.app/presave"}}}'
        />
      </Head>
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center bg-background overflow-hidden px-2 sm:px-0"
        style={{ height: '100vh' }}
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary mb-2 tracking-tight text-center">
          Asterion
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-8 text-center max-w-xs sm:max-w-md">
          Read your favourite novels on Farcaster while tipping authors
        </p>
        <div className="relative w-full max-w-xl h-40 sm:h-44 flex items-center justify-center mb-8 overflow-x-auto">
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none bg-gradient-to-r from-background via-transparent to-background z-10" />
          <div
            className="flex gap-3 sm:gap-6 animate-scroll-x flex-nowrap"
            style={{
              animation: 'scroll-x 24s linear infinite',
              minWidth: '600px',
              maxWidth: '100%'
            }}
          >
            {novelsLoading ? (
              <div className="text-white text-center w-full">Loading novels...</div>
            ) : novelsError ? (
              <div className="text-red-500 text-center w-full">Failed to load novels</div>
            ) : sortedNovels.length === 0 ? (
              <div className="text-muted-foreground text-center w-full">No novels found</div>
            ) : (
              sortedNovels.concat(sortedNovels).map((novel: Novel, idx: number) => (
                <div key={novel.id + '-' + idx} className="flex flex-col items-center w-20 sm:w-28">
                  <div className="w-20 h-28 sm:w-28 sm:h-36 rounded-lg overflow-hidden bg-card border border-border flex items-center justify-center mb-2 relative">
                    {/* Overlayed Rank badge */}
                    <span
                      className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 via-yellow-300 to-yellow-400 text-purple-900 border border-yellow-400 shadow ring-1 ring-yellow-200/60"
                      style={{ boxShadow: '0 1px 4px 0 rgba(168,85,247,0.12)' }}
                    >
                      #{(novel as any).rank || (idx % sortedNovels.length) + 1}
                    </span>
                    <Image
                      src={(novel as any).imageUrl || '/placeholder.svg?height=400&width=300'}
                      alt={novel.title}
                      width={80}
                      height={112}
                      className="w-20 h-28 sm:w-28 sm:h-36 object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs text-foreground text-center line-clamp-2 max-w-[4.5rem] sm:max-w-none">
                    {novel.title}
                  </span>
                </div>
              ))
            )}
          </div>
          <style jsx global>{`
            @keyframes scroll-x {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-300px);
              }
            }
          `}</style>
        </div>
        {!presaved ? (
          <>
            {!user && (
              <input
                type="email"
                className="mb-4 px-4 py-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-xs sm:max-w-md"
                placeholder="Enter your email to get notified"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            )}
            <Button
              className="bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:bg-primary/90 transition disabled:opacity-60 w-full max-w-xs sm:max-w-md"
              onClick={handlePreSave}
              disabled={loading || (!user && !email)}
              aria-label="Pre-save"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Pre-save'
              )}
            </Button>
            {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
          </>
        ) : (
          <>
            <div className="text-green-400 text-lg font-semibold mt-4 animate-pulse text-center">
              Thank you for joining our waitlist.
              <br />
              We&apos;ll send you a notification when we launch!
            </div>
            <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
              <DialogContent
                role="dialog"
                aria-modal="true"
                className="max-w-full w-[98vw] sm:w-full"
              >
                <DialogHeader>
                  <DialogTitle>Share Asterion on Farcaster</DialogTitle>
                  <DialogDescription>
                    Help us go viral! Share your pre-save with your Farcaster friends.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 mt-2 w-full">
                  <Image
                    src="/api/og/presave"
                    alt="Asterion Pre-save Viral Image"
                    width={600}
                    height={400}
                    className="rounded-lg border border-border w-full max-w-xs sm:max-w-md shadow-lg"
                    style={{ aspectRatio: '3/2', objectFit: 'cover' }}
                    priority
                  />
                  <Button
                    className="w-full bg-primary text-primary-foreground text-lg font-bold mt-2"
                    aria-label="Share on Farcaster"
                    ref={shareButtonRef}
                    onClick={() => {
                      const deepLink =
                        'https://farcaster.xyz/~/mini-apps/launch?domain=v0-asterion-next-js-application.vercel.app';
                      if (navigator.share) {
                        navigator.share({
                          title: 'Check out Asterion!',
                          text: 'Read novels on Farcaster while tipping authors.',
                          url: deepLink
                        });
                      } else {
                        navigator.clipboard.writeText(deepLink);
                        toast({
                          title: 'Link copied!',
                          description: 'Paste this link in Warpcast to share the mini-app.'
                        });
                      }
                    }}
                  >
                    Share on Farcaster
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full mt-2 max-w-xs sm:max-w-md"
                    aria-label="Copy Link"
                    onClick={handleCopyLink}
                  >
                    Copy Link
                  </Button>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" className="w-full mt-2" aria-label="Close Modal">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </>
  );
}

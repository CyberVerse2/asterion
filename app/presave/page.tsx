'use client';

import { useState } from 'react';
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

export default function PreSaveLanding() {
  const { user } = useUser();
  const { novels, isLoading: novelsLoading, error: novelsError } = useNovels(10);
  const [presaved, setPresaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Sort by rank if available
  const sortedNovels = ((novels as Novel[]) || [])
    .slice()
    .sort(
      (a: any, b: any) => (Number((a as any).rank) || 9999) - (Number((b as any).rank) || 9999)
    );

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
          content='{"version":"1","imageUrl":"/api/og/presave","button":{"title":"🚀 Pre-save Asterion","action":{"type":"launch_miniapp","url":"https://asterion.xyz/presave"}}}'
        />
        <meta
          name="fc:frame"
          content='{"version":"1","imageUrl":"/api/og/presave","button":{"title":"🚀 Pre-save Asterion","action":{"type":"launch_frame","url":"https://asterion.xyz/presave"}}}'
        />
      </Head>
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center bg-background overflow-hidden"
        style={{ height: '100vh' }}
      >
        <h1 className="text-4xl font-extrabold text-primary mb-2 tracking-tight">Asterion</h1>
        <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
          Read your favourite novels on Farcaster while tipping authors
        </p>
        <div className="relative w-full max-w-xl h-44 flex items-center justify-center mb-8 overflow-hidden">
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none bg-gradient-to-r from-background via-transparent to-background z-10" />
          <div
            className="flex gap-6 animate-scroll-x"
            style={{
              animation: 'scroll-x 24s linear infinite',
              minWidth: '1200px'
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
                <div key={novel.id + '-' + idx} className="flex flex-col items-center w-28">
                  <div className="w-28 h-36 rounded-lg overflow-hidden bg-card border border-border flex items-center justify-center mb-2 relative">
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
                      width={112}
                      height={144}
                      className="w-28 h-36 object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs text-foreground text-center line-clamp-2">
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
                transform: translateX(-600px);
              }
            }
          `}</style>
        </div>
        {!presaved ? (
          <>
            {!user && (
              <input
                type="email"
                className="mb-4 px-4 py-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your email to get notified"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            )}
            <Button
              className="bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:bg-primary/90 transition disabled:opacity-60"
              onClick={handlePreSave}
              disabled={loading || (!user && !email)}
            >
              {loading ? 'Saving...' : 'Pre-save'}
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Asterion on Farcaster</DialogTitle>
                  <DialogDescription>
                    Help us go viral! Share your pre-save with your Farcaster friends.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 mt-2">
                  <img
                    src="/api/og/presave"
                    alt="Asterion Pre-save Viral Image"
                    className="rounded-lg border border-border w-full max-w-md shadow-lg"
                    style={{ aspectRatio: '3/2', objectFit: 'cover' }}
                  />
                  <Button
                    className="w-full bg-primary text-primary-foreground text-lg font-bold mt-2"
                    onClick={() => {
                      window.open(
                        `https://warpcast.com/~/compose?text=${encodeURIComponent(
                          'Check out Asterion 🚀 https://asterion.xyz/presave'
                        )}`,
                        '_blank'
                      );
                    }}
                  >
                    Share on Farcaster
                  </Button>
                  <Button variant="secondary" className="w-full mt-2" onClick={handleCopyLink}>
                    Copy Link
                  </Button>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" className="w-full mt-2">
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

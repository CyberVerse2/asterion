'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Avatar as OnchainAvatar,
  Name as OnchainName,
  Identity
} from '@coinbase/onchainkit/identity';
import { Wallet } from '@coinbase/onchainkit/wallet';
import { useUser } from '@/providers/UserProvider';
import type { User } from '@/lib/types';
import { useState, useEffect, useRef } from 'react';
import {
  useAccount,
  useChainId,
  useConnect,
  useConnectors,
  useSignTypedData,
  useAccount as useWagmiAccount,
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi';
import { Address as ViemAddress, Hex, parseUnits, getAddress } from 'viem';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
  USDC_ADDRESS
} from '@/lib/abi/SpendPermissionManager';
import { ERC20_ABI } from '@/lib/abi/ERC20';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useRouter } from 'next/navigation';

interface UserProfile {
  farcasterUsername: string;
  totalTipped: number;
  novelsRead: number;
  chaptersLoved: number;
  tips: Array<{
    novelTitle: string;
    amount: number;
    date: string;
  }>;
}

// Extended tip type that includes novel and chapter relations for profile display
interface TipWithNovel {
  id: string;
  username: string;
  amount: number;
  novelId: string;
  userId: string;
  date: Date;
  novel?: {
    id: string;
    title: string;
  };
  chapter?: {
    id: string;
    title: string;
  };
}

// Inline SVG icon components
const DollarSign = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const BookOpen = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 7V17A2 2 0 0 0 4 19H20A2 2 0 0 0 22 17V7" />
    <path d="M12 3V21" />
  </svg>
);
const Heart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);
const Settings = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const Info = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const ArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const {
    user: profile,
    userLoading: isLoading,
    userError,
    refreshUser
  } = useUser() as {
    user: User | null;
    userLoading: boolean;
    userError: string | null;
    refreshUser: () => Promise<void>;
  };
  const [spendLimit, setSpendLimit] = useState(100);
  const [chapterTipAmount, setChapterTipAmount] = useState(0.01);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const { signTypedDataAsync } = useSignTypedData();
  const account = useAccount();
  const chainId = useChainId();
  const { connectAsync } = useConnect();
  const connectors = useConnectors();
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [transactionUrl, setTransactionUrl] = useState<string | null>(null);
  const { context } = useMiniKit();

  // Check if user has Farcaster context
  const hasFarcasterContext =
    context &&
    (((context as any).user && (context as any).user.fid) ||
      ((context as any).client &&
        ((context as any).client.fid || (context as any).client.clientFid)));

  // Alternative detection: if user has fid in profile, they're a Farcaster user
  const isFarcasterUser = Boolean(hasFarcasterContext || (profile && profile.fid));

  // Use OnchainKit components only for wallet-only users (no Farcaster context)
  const isWalletOnly = profile && profile.walletAddress && !hasFarcasterContext;

  // Initialize spendLimit and chapterTipAmount from user profile
  useEffect(() => {
    if (profile && typeof profile.spendLimit === 'number') {
      setSpendLimit(profile.spendLimit);
    }
    if (profile && typeof profile.chapterTipAmount === 'number') {
      setChapterTipAmount(profile.chapterTipAmount);
    }
  }, [profile]);

  // Save spendLimit to DB
  async function saveSpendLimit(value: number) {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, spendLimit: value })
      });
      if (!res.ok) throw new Error('Failed to save limit');
      const updated = await res.json();
      setSpendLimit(updated.spendLimit);
    } catch (e) {
      // Optionally show error
    } finally {
      setSaving(false);
    }
  }

  // Save chapterTipAmount to DB
  async function saveChapterTipAmount(value: number) {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, chapterTipAmount: value })
      });
      if (!res.ok) throw new Error('Failed to save chapter tip amount');
      const updated = await res.json();
      setChapterTipAmount(updated.chapterTipAmount);
    } catch (e) {
      // Optionally show error
    } finally {
      setSaving(false);
    }
  }

  // Optimized back navigation with fallback logic
  const handleBackNavigation = () => {
    // Check if there's browser history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to home page if no history (direct URL access)
      router.push('/');
    }
  };

  // Add keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key to go back (common UX pattern)
      if (event.key === 'Escape') {
        handleBackNavigation();
      }
    };

    // Only add listener on mobile devices where back button is visible
    const isMobile = window.innerWidth < 640; // sm breakpoint
    if (isMobile) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // Move handleApproveSpend inside the component
  async function handleApproveSpend() {
    setApproving(true);
    setApproveError(null);
    setTransactionStatus(null);
    setTransactionUrl(null);
    let accountAddress = account?.address;
    try {
      if (!accountAddress) {
        const requestAccounts = await connectAsync({ connector: connectors[0] });
        accountAddress = requestAccounts.accounts[0];
      }
      // Save spendLimit to DB if changed
      if (spendLimit !== profile?.spendLimit) {
        await saveSpendLimit(spendLimit);
      }
      // Save chapterTipAmount to DB if changed
      if (chapterTipAmount !== profile?.chapterTipAmount) {
        await saveChapterTipAmount(chapterTipAmount);
      }
      // Prepare spend permission with correct native types for EIP-712 signing
      // Generate unique salt to avoid hash collisions - use timestamp + user address for uniqueness
      const timestamp = BigInt(Math.floor(Date.now() / 1000)); // Current Unix timestamp
      const addressNumber = BigInt(accountAddress); // Convert address to BigInt
      const uniqueSalt = timestamp ^ (addressNumber >> BigInt(96)); // XOR timestamp with truncated address

      // Normalize addresses to proper checksum format
      const normalizedAccount = getAddress(accountAddress);
      const normalizedSpender = getAddress(process.env.NEXT_PUBLIC_SPENDER_ADDRESS as ViemAddress);
      const normalizedToken = getAddress(USDC_ADDRESS);

      const spendPermission = {
        account: normalizedAccount,
        spender: normalizedSpender,
        token: normalizedToken,
        allowance: parseUnits(spendLimit.toString(), 6), // BigInt
        period: 2592000, // number (30 days in seconds) - matching the working example
        start: Math.ceil(Date.now() / 1000), // number (current unix timestamp) - matching the working example
        end: Math.ceil(Date.now() / 1000) + 7 * 24 * 60 * 60, // number (7 days from now) - matching the working example
        salt: uniqueSalt, // BigInt (unique salt to prevent hash collisions)
        extraData: '0x' as Hex
      };

      // Ensure we're on Base mainnet (8453)
      if (chainId !== 8453) {
        setApproveError(`Please switch to Base mainnet. Current chain: ${chainId}, Expected: 8453`);
        setApproving(false);
        return;
      }

      const signature = await signTypedDataAsync({
        domain: {
          name: 'Spend Permission Manager',
          version: '1',
          chainId: chainId, // Keep as number for wagmi compatibility
          verifyingContract: spendPermissionManagerAddress
        },
        types: {
          SpendPermission: [
            { name: 'account', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'allowance', type: 'uint160' },
            { name: 'period', type: 'uint48' },
            { name: 'start', type: 'uint48' },
            { name: 'end', type: 'uint48' },
            { name: 'salt', type: 'uint256' },
            { name: 'extraData', type: 'bytes' }
          ]
        },
        primaryType: 'SpendPermission',
        message: spendPermission // Pass raw object directly, no string conversion
      });
      setApproved(true);

      // PATCH user with spendPermission and spendPermissionSignature
      if (profile?.id) {
        let patchOk = false;

        // Convert BigInt to strings for JSON serialization
        const replacer = (key: string, value: any) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          return value;
        };

        try {
          const patchRes = await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              {
                userId: profile.id,
                spendPermission: spendPermission,
                spendPermissionSignature: signature
              },
              replacer
            )
          });
          const patchData = await patchRes
            .clone()
            .json()
            .catch(() => ({}));

          if (!patchRes.ok) {
            setApproveError('Failed to save spend permission to database');
            setApproving(false);
            return;
          }
          patchOk = true;
        } catch (err) {
          console.error('[handleApproveSpend] PATCH /api/users error:', err);
          setApproveError('Failed to save spend permission to database');
          setApproving(false);
          return;
        }

        setTransactionStatus('pending');
        try {
          const response = await fetch('/api/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              {
                spendPermission: spendPermission,
                signature,
                userId: profile.id
              },
              replacer
            )
          });
          const data = await response
            .clone()
            .json()
            .catch(() => ({}));
          if (!response.ok) throw new Error('Failed to approve onchain');
          if (data.status === 'success') {
            setTransactionStatus('success');
            setTransactionUrl(data.transactionUrl);

            // Invalidate novel cache to refresh permission-dependent UI
            if (typeof window !== 'undefined') {
              import('swr').then(({ mutate }) => {
                // Invalidate novels list cache
                mutate('/api/novels');
                // Invalidate all novel detail caches (SWR will match patterns)
                mutate((key) => typeof key === 'string' && key.startsWith('/api/novels/'));
                // Invalidate all chapters caches
                mutate((key) => typeof key === 'string' && key.startsWith('/api/chapters'));
              });
            }
          } else {
            setTransactionStatus('failure');
            setTransactionUrl(null);
          }
        } catch (err) {
          console.error('[handleApproveSpend] POST /api/collect error:', err);
          setApproveError('Onchain approval failed');
          setTransactionStatus('failure');
          setTransactionUrl(null);
        }
      }
    } catch (e: any) {
      setApproveError(e.message || 'Signature or onchain approval failed');
      setTransactionStatus('failure');
      setTransactionUrl(null);
    }
    setApproving(false);
  }

  // For ERC-20 approve (Farcaster users)
  const spenderAddress = process.env.NEXT_PUBLIC_SPENDER_ADDRESS || '';
  const usdcAddress = USDC_ADDRESS;
  const approveAmount = parseUnits(spendLimit.toString(), 6);
  const {
    writeContract,
    data: approveTxHash,
    isPending: isApprovePending,
    error: approveErrorObj,
    isError: isApproveError
  } = useWriteContract();
  const { isLoading: isApproveTxLoading, isSuccess: isApproveTxSuccess } =
    useWaitForTransactionReceipt({
      hash: approveTxHash
    });

  // Handle Farcaster approval with connector check
  const handleFarcasterApproval = async () => {
    setApproving(true);
    setApproveError(null);

    try {
      // Save settings first
      if (spendLimit !== profile?.spendLimit) {
        await saveSpendLimit(spendLimit);
      }
      if (chapterTipAmount !== profile?.chapterTipAmount) {
        await saveChapterTipAmount(chapterTipAmount);
      }

      // Check if writeContract is available
      if (!writeContract) {
        setApproveError('Contract interaction not ready. Please refresh the page and try again.');
        return;
      }

      // Check if account is connected
      if (!account?.isConnected || !account?.address) {
        setApproveError('Wallet not connected. Please ensure you are in Farcaster and try again.');
        return;
      }

      // Call ERC20 approve directly
      writeContract({
        abi: ERC20_ABI,
        address: usdcAddress as `0x${string}`,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, approveAmount]
      });
    } catch (error: any) {
      console.error('[Profile] 🔥 Error in handleFarcasterApproval:', error);
      setApproveError(`Failed to approve spending: ${error.message || 'Unknown error'}`);
    } finally {
      setApproving(false);
    }
  };

  // Consolidated post-approval logic for Farcaster users
  useEffect(() => {
    if (isFarcasterUser && isApproveTxSuccess && profile?.id && approveTxHash) {
      // Execute all post-approval tasks in parallel
      const tasks = [];

      // Task 1: Save spendLimit to DB
      if (spendLimit !== profile.spendLimit) {
        tasks.push(
          fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile.id, spendLimit })
          }).catch((error) => console.error('[Profile] Error saving spend limit:', error))
        );
      }

      // Task 2: Save spend permission data
      if (profile.walletAddress) {
        const approvalData = {
          type: 'erc20_approval',
          walletAddress: profile.walletAddress,
          spendLimit: spendLimit,
          timestamp: Date.now(),
          approved: true,
          transactionHash: approveTxHash
        };

        tasks.push(
          fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.id,
              spendPermission: approvalData,
              spendPermissionSignature: approveTxHash
            })
          }).catch((error) => console.error('[Profile] Error saving approval data:', error))
        );
      }

      // Task 3: Refresh user data and invalidate novel cache after other tasks complete
      Promise.all(tasks)
        .then(() => {
          if (refreshUser) {
            return refreshUser();
          }
        })
        .then(() => {
          // Invalidate novel cache to refresh permission-dependent UI
          if (typeof window !== 'undefined') {
            import('swr').then(({ mutate }) => {
              // Invalidate novels list cache
              mutate('/api/novels');
              // Invalidate all novel detail caches (SWR will match patterns)
              mutate((key) => typeof key === 'string' && key.startsWith('/api/novels/'));
              // Invalidate all chapters caches
              mutate((key) => typeof key === 'string' && key.startsWith('/api/chapters'));
            });
          }
        })
        .catch((error) => {
          console.error('[Profile] Error in post-approval tasks:', error);
        });
    }
  }, [
    isFarcasterUser,
    isApproveTxSuccess,
    profile?.id,
    profile?.walletAddress,
    spendLimit,
    approveTxHash
  ]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-2xl sm:max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Enhanced Skeleton Loading */}
          <div className="animate-pulse">
            {/* Mobile header skeleton */}
            <div className="flex items-center gap-3 mb-4 sm:hidden">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>

            {/* Profile header skeleton */}
            <div className="flex items-center gap-3 sm:gap-6 mb-6">
              <div className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mb-6">
              <div className="h-24 sm:h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-24 sm:h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-24 sm:h-32 bg-gray-200 rounded-lg col-span-2 sm:col-span-1"></div>
            </div>

            {/* Content skeleton */}
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-2xl sm:max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Something went wrong</div>
            <div className="text-red-500 text-sm mb-4">{userError}</div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-2xl sm:max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Mobile Back Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="p-0.5 h-6 w-6 hover:bg-white/80 transition-colors focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Profile</h1>
          </div>

          {/* Enhanced Profile Header with Background */}
          <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded-2xl opacity-50"></div>
            <div className="relative flex items-center gap-4 sm:gap-6">
              {/* Avatar Section */}
              <div className="relative">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 flex-shrink-0 ring-2 ring-primary/30 shadow-lg">
                  <AvatarImage
                    src={
                      isWalletOnly
                        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.walletAddress}`
                        : typeof profile?.pfpUrl === 'string' && profile.pfpUrl.length > 0
                        ? profile.pfpUrl
                        : '/placeholder.svg'
                    }
                    alt="Profile Avatar"
                  />
                  <AvatarFallback className="text-xl sm:text-2xl md:text-3xl bg-gradient-to-br from-purple-400 to-indigo-400 text-white font-bold">
                    {typeof profile?.username === 'string' && profile.username.length > 0
                      ? profile.username.charAt(0).toUpperCase()
                      : '?'}
                  </AvatarFallback>
                </Avatar>
                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-success/20 rounded-full border-2 border-black/40 shadow-sm"></div>
              </div>

              {/* User Info Section */}
              <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                {/* Username */}
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate text-foreground">
                    {typeof profile?.username === 'string' ? profile.username : 'Unknown User'}
                  </h1>
                  {!isWalletOnly && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/20 text-primary border-primary/30 text-xs px-2 py-1"
                    >
                      Farcaster
                    </Badge>
                  )}
                </div>

                {/* User Type & Stats */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    Reader
                  </span>
                  {profile?.fid && (
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      FID: {profile.fid}
                    </span>
                  )}
                  {profile?.walletAddress && (
                    <span className="flex items-center gap-1 max-w-[120px] sm:max-w-[200px]">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span className="truncate font-mono text-xs">
                        {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
                      </span>
                    </span>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 sm:gap-6 pt-1">
                  <div className="flex items-center gap-1 text-success">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      $
                      {Array.isArray(profile?.tips)
                        ? (profile.tips as TipWithNovel[])
                            .reduce(
                              (sum, tip) => sum + (typeof tip.amount === 'number' ? tip.amount : 0),
                              0
                            )
                            .toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {Array.isArray(profile?.bookmarks) ? profile.bookmarks.length : 0} saved
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0 hidden sm:block">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card/10 border-border text-foreground hover:bg-card/20 transition-all duration-200"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Visual Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-card/40 backdrop-blur-sm px-4 text-sm text-muted-foreground">
                Activity
              </div>
            </div>
          </div>

          {/* Enhanced Tipping History */}
          <Card className="novel-card-dark border-border">
            <CardHeader className="bg-card/10 rounded-t-lg p-3 space-y-0">
              <CardTitle className="text-base sm:text-lg flex items-center gap-1 text-foreground">
                Recent Tips
                <Badge
                  variant="secondary"
                  className="ml-auto bg-primary/20 text-primary border-primary/30"
                >
                  {Array.isArray(profile?.tips) ? (profile.tips as TipWithNovel[]).length : 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(Array.isArray(profile?.tips) ? (profile.tips as TipWithNovel[]) : []).map(
                  (tip, index) => (
                    <div
                      key={index}
                      className="p-4 hover:bg-card/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="font-medium text-sm sm:text-base truncate text-foreground">
                            {tip.novel?.title || `Novel ID: ${tip.novelId}`}
                          </div>
                          {tip.chapter && (
                            <div className="text-xs sm:text-sm font-medium text-primary truncate">
                              {tip.chapter.title}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {tip.date ? new Date(tip.date).toLocaleDateString() : 'Unknown date'}
                          </div>
                        </div>
                        <Badge className="flex items-center flex-shrink-0 bg-success/20 text-success border-success/30 px-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-xs">
                            {typeof tip.amount === 'number' ? tip.amount.toFixed(2) : '0.00'}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  )
                )}
                {(!Array.isArray(profile?.tips) || profile.tips.length === 0) && (
                  <div className="text-center text-muted-foreground py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-card/5 rounded-full flex items-center justify-center">
                      <Heart className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-sm sm:text-base font-medium">No tips yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start reading to support authors!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visual Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-card/40 backdrop-blur-sm px-4 text-sm text-muted-foreground">
                Settings
              </div>
            </div>
          </div>

          {/* Enhanced Spend Settings */}
          <Card className="novel-card-dark border-border">
            <CardHeader className="bg-card/10 rounded-t-lg p-3 space-y-0">
              <CardTitle className="flex items-center gap-1 text-base sm:text-lg text-foreground">
                Spend Settings
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-blue-400 transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Control how much USDC the app can spend on your behalf</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Spend Limit Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Spend Limit</h3>
                    <p className="text-xs text-muted-foreground">Maximum total USDC</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      max={100000}
                      value={spendLimit}
                      onChange={(e) => setSpendLimit(Number(e.target.value))}
                      className="border border-border rounded-lg px-3 py-2 w-20 text-center text-foreground bg-card focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[100, 200, 500, 1000, 10000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setSpendLimit(amount)}
                      className={`text-xs px-3 py-1 ${
                        spendLimit === amount
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-card border-border text-muted-foreground hover:bg-primary/10'
                      }`}
                      disabled={saving}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tip Amount Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Tip Amount</h3>
                    <p className="text-xs text-muted-foreground">Per chapter tip</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0.1}
                      max={100}
                      step={0.01}
                      value={chapterTipAmount}
                      onChange={(e) => setChapterTipAmount(Number(e.target.value))}
                      className="border border-border rounded-lg px-3 py-2 w-20 text-center text-foreground bg-card focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[0.1, 0.25, 0.5, 1, 10].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setChapterTipAmount(amount)}
                      className={`text-xs px-3 py-1 ${
                        chapterTipAmount === amount
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-card border-border text-muted-foreground hover:bg-primary/10'
                      }`}
                      disabled={saving}
                    >
                      ${amount.toFixed(2)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status Messages */}
              {saving && (
                <div className="flex items-center gap-3 text-sm text-blue-400 bg-primary/10 border border-primary/30 p-3 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                  <span>Saving changes...</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t border-border">
                {isFarcasterUser ? (
                  <Button
                    onClick={handleFarcasterApproval}
                    disabled={
                      saving ||
                      approving ||
                      isApprovePending ||
                      isApproveTxLoading ||
                      !writeContract
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    {approving || isApprovePending || isApproveTxLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Approving...</span>
                      </div>
                    ) : isApproveTxSuccess ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-success flex items-center justify-center">
                          <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                            <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                          </svg>
                        </div>
                        <span className="text-white">Permission Granted</span>
                      </div>
                    ) : (
                      'Approve Spend'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleApproveSpend}
                    disabled={saving || approving}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    {approving ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Approving...</span>
                      </div>
                    ) : approved ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-success flex items-center justify-center">
                          <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                            <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                          </svg>
                        </div>
                        <span>Permission Granted</span>
                      </div>
                    ) : (
                      'Approve Spend'
                    )}
                  </Button>
                )}
              </div>

              {/* Error Messages */}
              {isFarcasterUser && (isApproveError || approveError) && (
                <div className="flex items-center gap-3 text-sm text-red-400 bg-red-500/10 border border-red-400/20 p-3 rounded-lg">
                  <div className="h-4 w-4 rounded-full bg-red-400 flex items-center justify-center">
                    <svg className="h-2 w-2 text-black" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M7.5 1L6.5 0 4 2.5 1.5 0 0.5 1 3 3.5 0.5 6 1.5 7 4 4.5 6.5 7 7.5 6 5 3.5z" />
                    </svg>
                  </div>
                  <span>{approveError || approveErrorObj?.message || 'Approval failed'}</span>
                </div>
              )}

              {!isFarcasterUser && approveError && (
                <div className="flex items-center gap-3 text-sm text-red-400 bg-red-500/10 border border-red-400/20 p-3 rounded-lg">
                  <div className="h-4 w-4 rounded-full bg-red-400 flex items-center justify-center">
                    <svg className="h-2 w-2 text-black" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M7.5 1L6.5 0 4 2.5 1.5 0 0.5 1 3 3.5 0.5 6 1.5 7 4 4.5 6.5 7 7.5 6 5 3.5z" />
                    </svg>
                  </div>
                  <span>{approveError}</span>
                </div>
              )}

              {isFarcasterUser && isApproveTxSuccess && (
                <div className="flex items-center gap-3 text-sm text-success bg-success/10 border border-success/30 p-3 rounded-lg">
                  <div className="h-4 w-4 rounded-full bg-success flex items-center justify-center">
                    <svg className="h-2 w-2 text-black" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                    </svg>
                  </div>
                  <span>Permission approved successfully!</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

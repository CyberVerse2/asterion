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
    userError
  } = useUser() as { user: User | null; userLoading: boolean; userError: string | null };
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

  // Debug logging for Farcaster context detection
  console.log('[Profile] Context detection debug:', {
    context: context,
    contextUser: context ? (context as any).user : null,
    contextClient: context ? (context as any).client : null,
    userFid: context && (context as any).user ? (context as any).user.fid : null,
    clientFid: context && (context as any).client ? (context as any).client.fid : null,
    clientClientFid: context && (context as any).client ? (context as any).client.clientFid : null,
    hasFarcasterContext: hasFarcasterContext,
    profileFid: profile?.fid
  });

  // Alternative detection: if user has fid in profile, they're a Farcaster user
  const isFarcasterUser = Boolean(hasFarcasterContext || (profile && profile.fid));

  console.log('[Profile] Final user type determination:', {
    hasFarcasterContext,
    profileHasFid: profile?.fid,
    isFarcasterUser,
    willUseERC20: isFarcasterUser
  });

  // ADDITIONAL DEBUG: Log the exact button that will be rendered
  console.log('[Profile] Button logic debug:', {
    isFarcasterUser,
    buttonType: isFarcasterUser ? 'FARCASTER (ERC20)' : 'WALLET (Coinbase)',
    functionToCall: isFarcasterUser ? 'handleFarcasterApproval' : 'handleApproveSpend'
  });

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
    console.log(
      '[Profile] 🚨 handleApproveSpend called - This should be Coinbase spend permissions'
    );
    console.log('[Profile] 🚨 User type check:', { isFarcasterUser, profileFid: profile?.fid });
    console.log('[Profile] 🚨 This function should NOT be called for Farcaster users!');

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

      console.log('[handleApproveSpend] Generated unique salt:', uniqueSalt.toString());

      // Normalize addresses to proper checksum format
      const normalizedAccount = getAddress(accountAddress);
      const normalizedSpender = getAddress(process.env.NEXT_PUBLIC_SPENDER_ADDRESS as ViemAddress);
      const normalizedToken = getAddress(USDC_ADDRESS);

      console.log('[handleApproveSpend] Normalized addresses:', {
        account: normalizedAccount,
        spender: normalizedSpender,
        token: normalizedToken
      });

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

      console.log('[handleApproveSpend] spendPermission with native types:', spendPermission);
      console.log('[handleApproveSpend] About to sign with domain:', {
        name: 'Spend Permission Manager',
        version: '1',
        chainId: chainId,
        verifyingContract: spendPermissionManagerAddress
      });
      console.log('[handleApproveSpend] Chain ID being used:', chainId);

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

      console.log('[handleApproveSpend] Generated signature:', signature);
      console.log('[handleApproveSpend] Signature length:', signature.length);
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
          console.log(
            '[handleApproveSpend] PATCH /api/users response:',
            patchRes.status,
            patchData
          );
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
          console.log('[handleApproveSpend] POST /api/collect response:', response.status, data);
          if (!response.ok) throw new Error('Failed to approve onchain');
          if (data.status === 'success') {
            setTransactionStatus('success');
            setTransactionUrl(data.transactionUrl);
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
    console.log('[Profile] 🎯 handleFarcasterApproval called - This should be ERC20 approve');
    console.log('[Profile] 🎯 User type check:', { isFarcasterUser, profileFid: profile?.fid });

    if (!account?.address) {
      console.log('[Profile] No account address, attempting to connect...');
      try {
        const connectResult = await connectAsync({ connector: connectors[0] });
        console.log('[Profile] Connected successfully:', connectResult);

        // Wait a bit for the connection to be established
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Retry the approval after connection
        if (writeContract) {
          writeContract({
            abi: ERC20_ABI,
            address: usdcAddress as `0x${string}`,
            functionName: 'approve',
            args: [spenderAddress as `0x${string}`, approveAmount]
          });
        }
      } catch (error) {
        console.error('[Profile] Connection failed:', error);
        setApproveError('Failed to connect wallet. Please try again.');
      }
    } else if (writeContract) {
      writeContract({
        abi: ERC20_ABI,
        address: usdcAddress as `0x${string}`,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, approveAmount]
      });
    } else {
      setApproveError('Wallet not ready. Please refresh and try again.');
    }
  };

  // Save spendLimit to DB after ERC-20 approve for Farcaster users
  useEffect(() => {
    if (isFarcasterUser && isApproveTxSuccess && profile?.id) {
      fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, spendLimit })
      });
    }
  }, [isFarcasterUser, isApproveTxSuccess, profile?.id, spendLimit]);

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
          <div className="relative bg-black/40 backdrop-blur-sm rounded-2xl p-3 border border-white/10 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded-2xl opacity-50"></div>
            <div className="relative flex items-center gap-2 sm:gap-4">
              {isWalletOnly ? (
                <>
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 flex-shrink-0 ring-2 ring-purple-400/30">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.walletAddress}`}
                      alt="Profile Avatar"
                    />
                    <AvatarFallback className="text-lg sm:text-xl md:text-2xl bg-gradient-to-br from-purple-400 to-indigo-400 text-white">
                      {typeof profile?.username === 'string' && profile.username.length > 0
                        ? profile.username.charAt(0).toUpperCase()
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 px-2">
                    <div className="text-lg sm:text-xl font-bold truncate text-white">
                      {typeof profile?.username === 'string' ? profile.username : 'unknown'}
                    </div>
                    <div className="text-sm text-gray-400">Reader</div>
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 flex-shrink-0 ring-2 ring-purple-400/30">
                    <AvatarImage
                      src={
                        typeof profile?.pfpUrl === 'string' && profile.pfpUrl.length > 0
                          ? profile.pfpUrl
                          : '/placeholder.svg'
                      }
                    />
                    <AvatarFallback className="text-lg sm:text-xl md:text-2xl bg-gradient-to-br from-purple-400 to-indigo-400 text-white">
                      {typeof profile?.username === 'string' && profile.username.length > 0
                        ? profile.username.charAt(0).toUpperCase()
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg sm:text-xl font-bold mb-1 truncate text-white">
                      {typeof profile?.username === 'string' ? profile.username : 'unknown'}
                    </div>
                    <div className="text-sm text-gray-400">Reader</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 novel-card-dark border-green-400/30">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                  <span className="text-sm text-green-400">Tipped</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">
                    $
                    {Array.isArray(profile?.tips)
                      ? (profile.tips as TipWithNovel[])
                          .reduce(
                            (sum, tip) => sum + (typeof tip.amount === 'number' ? tip.amount : 0),
                            0
                          )
                          .toFixed(2)
                      : '0.00'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 novel-card-dark border-blue-400/30">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <BookOpen className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-sm text-blue-400">Saved</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-400">
                    {Array.isArray(profile?.bookmarks) ? profile.bookmarks.length : 0}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-black/40 backdrop-blur-sm px-4 text-sm text-gray-400">
                Activity
              </div>
            </div>
          </div>

          {/* Enhanced Tipping History */}
          <Card className="novel-card-dark border-white/10">
            <CardHeader className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-t-lg p-3 space-y-0">
              <CardTitle className="text-base sm:text-lg flex items-center gap-1 text-white">
                Recent Tips
                <Badge
                  variant="secondary"
                  className="ml-auto bg-purple-500/20 text-purple-300 border-purple-400/30"
                >
                  {Array.isArray(profile?.tips) ? (profile.tips as TipWithNovel[]).length : 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/10">
                {(Array.isArray(profile?.tips) ? (profile.tips as TipWithNovel[]) : []).map(
                  (tip, index) => (
                    <div
                      key={index}
                      className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="font-medium text-sm sm:text-base truncate text-white">
                            {tip.novel?.title || `Novel ID: ${tip.novelId}`}
                          </div>
                          {tip.chapter && (
                            <div className="text-xs sm:text-sm font-medium text-purple-400 truncate">
                              {tip.chapter.title}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {tip.date ? new Date(tip.date).toLocaleDateString() : 'Unknown date'}
                          </div>
                        </div>
                        <Badge className="flex items-center flex-shrink-0 bg-green-500/20 text-green-300 border-green-400/30 px-1">
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
                  <div className="text-center text-gray-400 py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                      <Heart className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-sm sm:text-base font-medium">No tips yet</p>
                    <p className="text-xs text-gray-500 mt-1">Start reading to support authors!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visual Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-black/40 backdrop-blur-sm px-4 text-sm text-gray-400">
                Settings
              </div>
            </div>
          </div>

          {/* Enhanced Spend Settings */}
          <Card className="novel-card-dark border-white/10">
            <CardHeader className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-t-lg p-3 space-y-0">
              <CardTitle className="flex items-center gap-1 text-base sm:text-lg text-white">
                Spend Settings
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-400 transition-colors" />
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
                    <h3 className="font-medium text-white">Spend Limit</h3>
                    <p className="text-xs text-gray-400">Maximum total USDC</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      max={100000}
                      value={spendLimit}
                      onChange={(e) => setSpendLimit(Number(e.target.value))}
                      className="border border-white/20 rounded-lg px-3 py-2 w-20 text-center text-white bg-black/20 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[10, 25, 50, 100].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setSpendLimit(amount)}
                      className={`text-xs px-3 py-1 ${
                        spendLimit === amount
                          ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                          : 'bg-black/20 border-white/10 text-gray-300 hover:bg-purple-500/10'
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
                    <h3 className="font-medium text-white">Tip Amount</h3>
                    <p className="text-xs text-gray-400">Per chapter tip</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      max={10}
                      step={0.01}
                      value={chapterTipAmount}
                      onChange={(e) => setChapterTipAmount(Number(e.target.value))}
                      className="border border-white/20 rounded-lg px-3 py-2 w-20 text-center text-white bg-black/20 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[0.01, 0.05, 0.1, 0.25].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setChapterTipAmount(amount)}
                      className={`text-xs px-3 py-1 ${
                        chapterTipAmount === amount
                          ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                          : 'bg-black/20 border-white/10 text-gray-300 hover:bg-purple-500/10'
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
                <div className="flex items-center gap-3 text-sm text-blue-400 bg-blue-500/10 border border-blue-400/20 p-3 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                  <span>Saving changes...</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t border-white/10">
                {isFarcasterUser ? (
                  <Button
                    onClick={handleFarcasterApproval}
                    disabled={saving || isApprovePending || isApproveTxLoading || !writeContract}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    {isApprovePending || isApproveTxLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Approving...</span>
                      </div>
                    ) : isApproveTxSuccess ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
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
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
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
              {isFarcasterUser && isApproveError && (
                <div className="flex items-center gap-3 text-sm text-red-400 bg-red-500/10 border border-red-400/20 p-3 rounded-lg">
                  <div className="h-4 w-4 rounded-full bg-red-400 flex items-center justify-center">
                    <svg className="h-2 w-2 text-black" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M7.5 1L6.5 0 4 2.5 1.5 0 0.5 1 3 3.5 0.5 6 1.5 7 4 4.5 6.5 7 7.5 6 5 3.5z" />
                    </svg>
                  </div>
                  <span>{approveErrorObj?.message || 'Approval failed'}</span>
                </div>
              )}

              {isFarcasterUser && isApproveTxSuccess && (
                <div className="flex items-center gap-3 text-sm text-green-400 bg-green-500/10 border border-green-400/20 p-3 rounded-lg">
                  <div className="h-4 w-4 rounded-full bg-green-400 flex items-center justify-center">
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

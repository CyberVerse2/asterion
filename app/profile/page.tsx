'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Avatar as OnchainAvatar,
  Name as OnchainName,
  Address
} from '@coinbase/onchainkit/identity';
import { useUser } from '@/providers/UserProvider';
import type { User } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useAccount, useChainId, useConnect, useConnectors, useSignTypedData } from 'wagmi';
import { Address as ViemAddress, Hex, parseUnits, getAddress } from 'viem';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
  USDC_ADDRESS
} from '@/lib/abi/SpendPermissionManager';
import { Tooltip } from '@/components/ui/tooltip';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

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

// Fallback component for OnchainKit Avatar when it fails to load
function FallbackAvatar({ address, className }: { address: string; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
        {address.slice(2, 4).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

// Fallback component for OnchainKit Name when it fails to load
function FallbackName({ address, className }: { address: string; className?: string }) {
  return (
    <span className={className}>
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  );
}

// Enhanced OnchainKit Avatar with fallback
function EnhancedOnchainAvatar({
  address,
  className
}: {
  address: ViemAddress;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Reset states when address changes
    setHasError(false);
    setIsLoading(true);
    setShowFallback(false);

    console.log('[EnhancedOnchainAvatar] Loading avatar for address:', address);

    // Set a timeout to detect if OnchainKit component has loaded data
    const timer = setTimeout(() => {
      console.log('[EnhancedOnchainAvatar] Timeout reached - checking if avatar loaded');
      setShowFallback(true);
      setIsLoading(false);
    }, 3000); // Reduced to 3 seconds for better UX

    return () => {
      clearTimeout(timer);
    };
  }, [address]);

  if (showFallback) {
    console.log(
      '[EnhancedOnchainAvatar] Using fallback for address (likely no Basename registered):',
      address
    );
    return <FallbackAvatar address={address} className={className} />;
  }

  return (
    <div className="relative">
      <OnchainAvatar address={address} className={className} />
      {/* Debug indicator */}
      <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-xs px-1 rounded">
        OCK
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full opacity-50"></div>
      )}
    </div>
  );
}

// Enhanced OnchainKit Name with fallback
function EnhancedOnchainName({ address, className }: { address: ViemAddress; className?: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setShowFallback(false);

    console.log('[EnhancedOnchainName] Loading name for address:', address);

    const timer = setTimeout(() => {
      console.log('[EnhancedOnchainName] Timeout reached - checking if name loaded');
      setShowFallback(true);
      setIsLoading(false);
    }, 3000); // Reduced to 3 seconds for better UX

    return () => {
      clearTimeout(timer);
    };
  }, [address]);

  if (showFallback) {
    console.log(
      '[EnhancedOnchainName] Using fallback for address (likely no Basename registered):',
      address
    );
    return <FallbackName address={address} className={className} />;
  }

  return (
    <div className="relative inline-block">
      <OnchainName address={address} className={className} />
      {isLoading && <span className="text-gray-400 ml-2">Loading...</span>}
    </div>
  );
}

export default function ProfilePage() {
  const {
    user: profile,
    userLoading: isLoading,
    userError
  } = useUser() as { user: User | null; userLoading: boolean; userError: string | null };
  const [showSpendPermission, setShowSpendPermission] = useState(false);
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

  // Check if user is wallet-only (no Farcaster profile)
  // This handles the anomaly where user has fid in DB but isn't currently in Farcaster context
  // In dev mode, context might be null/undefined when not in actual Farcaster app
  const isInRealFarcasterApp = context && context.client && process.env.NODE_ENV !== 'development';
  const isWalletOnly = profile && profile.walletAddress && !isInRealFarcasterApp;

  // TEMPORARY: Force wallet-only mode for testing if wallet is connected
  const forceWalletOnly = account.isConnected && account.address;

  // TEST MODE: Set this to true to force OnchainKit display for testing
  const FORCE_ONCHAIN_TEST = false; // Change this to test OnchainKit components
  const testWalletOnly = FORCE_ONCHAIN_TEST && account.isConnected && account.address;

  // Debug the user profile data and OnchainKit configuration
  useEffect(() => {
    if (profile) {
      console.log('[Profile Debug] Full user profile:', profile);
      console.log('[Profile Debug] isWalletOnly:', isWalletOnly);
      console.log('[Profile Debug] profile.fid:', profile.fid);
      console.log('[Profile Debug] profile.walletAddress:', profile.walletAddress);
      console.log('[Profile Debug] context:', context);
      console.log('[Profile Debug] isInRealFarcasterApp:', isInRealFarcasterApp);
      console.log('[Profile Debug] NEW isWalletOnly logic result:', isWalletOnly);
      console.log('[Profile Debug] account.isConnected:', account.isConnected);
      console.log('[Profile Debug] account.address:', account.address);
      console.log('[Profile Debug] chainId:', chainId);
      console.log(
        '[Profile Debug] CDP API Key present:',
        !!process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY
      );
      console.log(
        '[Profile Debug] CDP API Key value:',
        process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY?.slice(0, 10) + '...'
      );

      // Test network connectivity to CDP API
      if (process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY && profile.walletAddress) {
        console.log('[Profile Debug] Testing CDP API connectivity...');

        // Test if we can reach the CDP API
        fetch(
          `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [profile.walletAddress, 'latest'],
              id: 1
            })
          }
        )
          .then((response) => {
            console.log('[Profile Debug] CDP API test response status:', response.status);
            return response.json();
          })
          .then((data) => {
            console.log('[Profile Debug] CDP API test response data:', data);
          })
          .catch((error) => {
            console.error('[Profile Debug] CDP API test failed:', error);
          });
      }
    }
  }, [profile, isWalletOnly, account, context, isInRealFarcasterApp, chainId]);

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
                signature
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (userError) {
    return <div className="container mx-auto px-4 py-8 text-red-500">Error: {userError}</div>;
  }

  if (!profile) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6">
          {testWalletOnly ? (
            <>
              <OnchainAvatar address={account.address as ViemAddress} className="h-20 w-20" />
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  <OnchainName address={account.address as ViemAddress} />
                </h1>
                <p className="text-muted-foreground">Asterion Reader (Test Wallet Mode)</p>
              </div>
            </>
          ) : isWalletOnly ? (
            <>
              {/* Enhanced OnchainKit Components with Fallbacks */}
              <EnhancedOnchainAvatar
                address={profile.walletAddress as ViemAddress}
                className="h-20 w-20"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  <EnhancedOnchainName
                    address={profile.walletAddress as ViemAddress}
                    className="text-white"
                  />
                </h1>
                <p className="text-muted-foreground">Asterion Reader</p>
                {/* Debug information */}
                <div className="text-xs text-gray-500 mt-2">
                  <div>
                    Wallet: {profile.walletAddress?.slice(0, 6)}...
                    {profile.walletAddress?.slice(-4)}
                  </div>
                  <div>Chain: {chainId}</div>
                  <div>OnchainKit Mode: Active</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={
                    typeof profile?.pfpUrl === 'string' && profile.pfpUrl.length > 0
                      ? profile.pfpUrl
                      : '/placeholder.svg'
                  }
                />
                <AvatarFallback className="text-2xl">
                  {typeof profile?.username === 'string' && profile.username.length > 0
                    ? profile.username.charAt(0).toUpperCase()
                    : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  @{typeof profile?.username === 'string' ? profile.username : 'unknown'}
                </h1>
                <p className="text-muted-foreground">Asterion Reader &amp; Supporter</p>
                <div className="text-xs text-gray-500 mt-2">
                  <div>FID: {profile.fid}</div>
                  <div>Farcaster Mode: Active</div>
                </div>
              </div>
            </>
          )}
          <Button className="flex items-center gap-2 bg-transparent">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        {/* Additional Debug Panel - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader>
              <CardTitle className="text-yellow-600">Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Profile Data:</strong>
                  <ul className="text-xs space-y-1 mt-1">
                    <li>FID: {profile.fid || 'None'}</li>
                    <li>Username: {profile.username || 'None'}</li>
                    <li>Wallet: {profile.walletAddress || 'None'}</li>
                    <li>Is Wallet Only: {isWalletOnly ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
                <div>
                  <strong>Environment:</strong>
                  <ul className="text-xs space-y-1 mt-1">
                    <li>Chain ID: {chainId}</li>
                    <li>Connected: {account.isConnected ? 'Yes' : 'No'}</li>
                    <li>
                      CDP Key: {process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY ? 'Present' : 'Missing'}
                    </li>
                    <li>Context: {context ? 'Present' : 'None'}</li>
                  </ul>
                </div>
              </div>
              {isWalletOnly && (
                <div className="mt-4 p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                  <strong>OnchainKit Status:</strong> Active for wallet {profile.walletAddress}
                  <br />
                  <small>
                    <strong>Note:</strong> If you see a fallback display (wallet address format),
                    this likely means no Basename is registered for this wallet address.
                  </small>
                  <br />
                  <small>
                    <strong>To get a Basename:</strong> Visit{' '}
                    <a
                      href="https://www.base.org/names"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      base.org/names
                    </a>{' '}
                    to register one for your wallet.
                  </small>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tipped</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Placeholder: Sum of tip amounts */}
              <div className="text-2xl font-bold">
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
              <p className="text-xs text-muted-foreground">Supporting amazing authors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novels Bookmarked</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Number of bookmarks */}
              <div className="text-2xl font-bold">
                {Array.isArray(profile?.bookmarks) ? profile.bookmarks.length : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Stories you&apos;ve saved to your library
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chapters Loved</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Placeholder: Number of tips */}
              <div className="text-2xl font-bold">
                {Array.isArray(profile?.tips) ? (profile.tips as TipWithNovel[]).length : 0}
              </div>
              <p className="text-xs text-muted-foreground">Double-clicked with love</p>
            </CardContent>
          </Card>
        </div>

        {/* Tipping History */}
        <Card>
          <CardHeader>
            <CardTitle>Tipping History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Array.isArray(profile?.tips) ? (profile.tips as TipWithNovel[]) : []).map(
                (tip, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {tip.novel?.title || `Novel ID: ${tip.novelId}`}
                      </div>
                      {tip.chapter ? (
                        <div className="text-sm font-medium text-purple-400">
                          {tip.chapter.title}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Chapter information not available
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {tip.date ? new Date(tip.date).toLocaleDateString() : 'Unknown date'}
                      </div>
                    </div>
                    <Badge className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {typeof tip.amount === 'number' ? tip.amount.toFixed(2) : '0.00'}
                    </Badge>
                  </div>
                )
              )}
              {(!Array.isArray(profile?.tips) || profile.tips.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  No tips yet. Start reading and loving chapters to support authors!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spend Limits Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Spend Settings
              <Tooltip content="These settings control how much USDC the app can spend on your behalf. You can adjust them anytime.">
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Spend Limit */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Overall Spend Limit</div>
                  <div className="text-sm text-muted-foreground">Maximum total USDC allowed</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={spendLimit}
                      onChange={(e) => setSpendLimit(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-24 text-right text-black"
                      aria-label="Spend Limit in USDC"
                      disabled={saving}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">USDC</span>
                </div>
              </div>

              {/* Chapter Tip Amount */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Chapter Tip Amount</div>
                  <div className="text-sm text-muted-foreground">USDC per chapter when loving</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <input
                      type="number"
                      min={0.01}
                      max={10}
                      step={0.01}
                      value={chapterTipAmount}
                      onChange={(e) => setChapterTipAmount(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-24 text-right text-black"
                      aria-label="Chapter Tip Amount in USDC"
                      disabled={saving}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">USDC</span>
                </div>
              </div>

              {saving && (
                <div className="text-xs text-blue-500 animate-pulse">Saving settings...</div>
              )}
              {!saving &&
                (spendLimit !== profile?.spendLimit ||
                  chapterTipAmount !== profile?.chapterTipAmount) && (
                  <div className="text-xs text-green-600">Settings updated!</div>
                )}
              <Button onClick={handleApproveSpend} disabled={saving || approving}>
                {approving ? 'Approving...' : approved ? 'Permission Granted' : 'Approve Spend'}
              </Button>
              {approved && (
                <div className="text-green-600 dark:text-green-400 font-medium mt-2">
                  Spend Permission Signed!
                </div>
              )}
              {approveError && (
                <div className="text-red-600 dark:text-red-400 font-medium mt-2">
                  {approveError}
                </div>
              )}
              {transactionStatus === 'pending' && (
                <div className="text-blue-600 dark:text-blue-400 font-medium mt-2">
                  Onchain approval pending...
                </div>
              )}
              {transactionStatus === 'success' && transactionUrl && (
                <div className="text-green-600 dark:text-green-400 font-medium mt-2">
                  Onchain approval successful!{' '}
                  <a
                    href={transactionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View on BaseScan
                  </a>
                </div>
              )}
              {transactionStatus === 'failure' && (
                <div className="text-red-600 dark:text-red-400 font-medium mt-2">
                  Onchain approval failed.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

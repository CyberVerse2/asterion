'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/providers/UserProvider';
import type { User } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useAccount, useChainId, useConnect, useConnectors, useSignTypedData } from 'wagmi';
import { Address, Hex, parseUnits } from 'viem';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
  USDC_ADDRESS
} from '@/lib/abi/SpendPermissionManager';
import { Tooltip } from '@/components/ui/tooltip';

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

export default function ProfilePage() {
  const {
    user: profile,
    userLoading: isLoading,
    userError
  } = useUser() as { user: User | null; userLoading: boolean; userError: string | null };
  const [showSpendPermission, setShowSpendPermission] = useState(false);
  const [spendLimit, setSpendLimit] = useState(100);
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

  // Initialize spendLimit from user profile
  useEffect(() => {
    if (profile && typeof profile.spendLimit === 'number') {
      setSpendLimit(profile.spendLimit);
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
      // Prepare spend permission
      const spendPermission = {
        account: accountAddress,
        spender: process.env.NEXT_PUBLIC_SPENDER_ADDRESS as Address,
        token: USDC_ADDRESS,
        allowance: parseUnits(spendLimit.toString(), 6),
        period: BigInt(2592000),
        start: BigInt(0),
        end: BigInt(281474976710655),
        salt: BigInt(0),
        extraData: '0x' as Hex
      };
      const signature = await signTypedDataAsync({
        domain: {
          name: 'Spend Permission Manager',
          version: '1',
          chainId: chainId,
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
        message: spendPermission as any
      });
      setApproved(true);

      // PATCH user with spendPermission and spendPermissionSignature
      if (profile?.id) {
        const replacer = (key: string, value: any) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          return value;
        };
        let patchOk = false;
        try {
          const patchRes = await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              {
                userId: profile.id,
                spendPermission,
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
            body: JSON.stringify({ spendPermission, signature }, replacer)
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
          </div>
          <Button className="flex items-center gap-2 bg-transparent">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

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
                  ? profile.tips
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
                {Array.isArray(profile?.tips) ? profile.tips.length : 0}
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
              {(Array.isArray(profile?.tips) ? profile.tips : []).map((tip, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    {/* Placeholder: Show novelId instead of novelTitle */}
                    <div className="font-medium">Novel ID: {tip.novelId}</div>
                    <div className="text-sm text-muted-foreground">
                      {tip.date ? new Date(tip.date).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <Badge className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {typeof tip.amount === 'number' ? tip.amount.toFixed(2) : '0.00'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spend Limits Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Spend Limit
              <Tooltip content="This limit controls the maximum USDC the app can spend on your behalf. You can adjust it anytime.">
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Spend Limit</div>
                  <div className="text-sm text-muted-foreground">Maximum tips allowed</div>
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
              {saving && <div className="text-xs text-blue-500 animate-pulse">Saving limit...</div>}
              {!saving && spendLimit !== profile?.spendLimit && (
                <div className="text-xs text-green-600">Limit updated!</div>
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

'use client';

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink
} from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity } from '@coinbase/onchainkit/identity';
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/providers/UserProvider';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import Link from 'next/link';
import type { User } from '@/lib/types';

export default function HeaderWallet() {
  const { user } = useUser() as { user: User | null };
  const { context } = useMiniKit();

  // Check if user has Farcaster context
  const hasFarcasterContext =
    context &&
    (((context as any).user && (context as any).user.fid) ||
      ((context as any).client &&
        ((context as any).client.fid || (context as any).client.clientFid)));

  // Check if user is in miniapp environment
  const isInMiniApp = hasFarcasterContext;

  if (user && user.walletAddress && !hasFarcasterContext) {
    // Wallet-only user (no Farcaster context)
    return (
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name className="hidden sm:block" />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address />
          </Identity>
          {!isInMiniApp && <WalletDropdownLink href="/profile">View Profile</WalletDropdownLink>}
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    );
  }

  if (user && user.fid && hasFarcasterContext) {
    // Farcaster user
    return (
      <div className="flex items-center gap-2">
        <Link href="/profile">
          <UIAvatar className="h-8 w-8 sm:h-6 sm:w-6 cursor-pointer hover:opacity-80 transition-opacity border-2 border-purple-400/30 hover:border-purple-400/50">
            <AvatarImage src={user.pfpUrl} alt={user.username} />
            <AvatarFallback>{user.username?.[0] || 'U'}</AvatarFallback>
          </UIAvatar>
        </Link>
        <Link href="/profile" className="text-sm font-medium hover:underline hidden sm:block">
          {user.username}
        </Link>
      </div>
    );
  }

  // No user - show connect wallet
  return (
    <Wallet>
      <ConnectWallet>
        <Avatar className="h-6 w-6" />
        <Name className="hidden sm:block" />
      </ConnectWallet>
    </Wallet>
  );
}

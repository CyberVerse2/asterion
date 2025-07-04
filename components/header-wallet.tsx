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

  // Show Farcaster profile for users in Farcaster context
  if (hasFarcasterContext && user) {
    return (
      <div className="flex justify-end">
        <Link href="/profile" className="flex items-center gap-2 hover:opacity-80">
          <UIAvatar className="h-6 w-6">
            <AvatarImage
              src={
                typeof user.pfpUrl === 'string' && user.pfpUrl.length > 0
                  ? user.pfpUrl
                  : '/placeholder.svg'
              }
            />
            <AvatarFallback className="text-xs">
              {typeof user.username === 'string' && user.username.length > 0
                ? user.username.charAt(0).toUpperCase()
                : '?'}
            </AvatarFallback>
          </UIAvatar>
          <span className="text-sm font-medium hidden sm:block">
            @{typeof user.username === 'string' ? user.username : 'unknown'}
          </span>
        </Link>
      </div>
    );
  }

  // Show wallet connection for wallet-only users
  return (
    <div className="flex justify-end">
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Address className="text-gray-400" />
          </Identity>
          <WalletDropdownLink icon="user" href="/profile">
            Profile
          </WalletDropdownLink>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}

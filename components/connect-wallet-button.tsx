'use client';

import { Button } from '@/components/ui/button';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Wallet, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function ConnectWalletButton() {
  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Check if we're in a Farcaster mini app
  const isFarcasterMiniApp = !!(context?.client || context?.user);

  // Also check for Farcaster context in window
  let hasFarcasterContext = false;
  if (typeof window !== 'undefined') {
    hasFarcasterContext = !!(window as any).farcaster;
  }

  // If we're in Farcaster mini app or have Farcaster context, don't show connect button
  if (isFarcasterMiniApp || hasFarcasterContext) {
    return null;
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = () => {
    // Use the first (and only) connector which should be Coinbase Smart Wallet
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Wallet className="h-4 w-4" />
            {formatAddress(address)}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => disconnect()}>Disconnect Wallet</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700"
      disabled={isPending}
      onClick={handleConnect}
    >
      <Wallet className="h-4 w-4" />
      {isPending ? 'Connecting...' : 'Connect Coinbase Wallet'}
    </Button>
  );
}

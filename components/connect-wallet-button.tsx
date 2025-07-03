'use client';

import { Button } from '@/components/ui/button';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Wallet, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

export default function ConnectWalletButton() {
  const { context } = useMiniKit();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [isPending, setIsPending] = useState(false);

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

  // Check for existing wallet connection
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            setIsConnected(true);
            setAddress(accounts[0]);
          }
        } catch (error) {
          console.log('Error checking wallet connection:', error);
        }
      }
    };
    checkConnection();
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    setIsPending(true);
    try {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setIsConnected(true);
        setAddress(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsPending(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress('');
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
          <DropdownMenuItem onClick={disconnectWallet}>Disconnect Wallet</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2 bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:border-purple-700"
      disabled={isPending}
      onClick={connectWallet}
    >
      <Wallet className="h-4 w-4" />
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}

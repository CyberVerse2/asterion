export interface User {
  id: string;
  fid?: number; // Farcaster ID - optional for wallet-only users
  username?: string; // Username - optional for wallet-only users (will be generated for wallet-only)
  walletAddress?: string; // Wallet address for wallet-only users
  novels: string[];
  bookmarks: string[];
  tips: Tip[];
  createdAt: Date;
  updatedAt: Date;
  pfpUrl?: string;
  spendLimit?: number;
  chapterTipAmount?: number; // Amount in USDC to tip per chapter
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  chapters: Chapter[];
  totalTips: number;
  tipCount: number;
  loves: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  loves: number;
  novelId: string;
}

export interface Tip {
  id: string;
  username: string;
  amount: number;
  novelId: string;
  userId: string;
  date: Date;
}

export interface TipDistribution {
  authorAmount: number;
  zoraAmount: number;
  liquidityAmount: number;
  asterionAmount: number;
}

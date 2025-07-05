export interface User {
  id: string;
  fid?: number; // Farcaster ID - optional for wallet-only users
  username?: string; // Username - optional for wallet-only users (will be generated for wallet-only)
  walletAddress?: string; // Wallet address for wallet-only users
  novels: string[];
  bookmarks: string[];
  tips: Tip[];
  readingProgress?: ReadingProgress[]; // User's reading progress across chapters
  createdAt: Date;
  updatedAt: Date;
  pfpUrl?: string;
  spendLimit?: number;
  chapterTipAmount?: number; // Amount in USDC to tip per chapter
  spendPermission?: any; // JSON object containing spend permission data
  spendPermissionSignature?: string; // Signature for the spend permission
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
  readingProgress?: ReadingProgress[]; // Reading progress for this chapter
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

export interface ReadingProgress {
  id: string;
  userId: string;
  chapterId: string;
  currentLine: number; // Current line number (0-based)
  totalLines: number; // Total lines in the chapter
  progressPercentage: number; // Percentage complete (0-100)
  scrollPosition: number; // Scroll position in pixels for fallback
  lastReadAt: Date; // When user last read this chapter
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  username: string;
  novels: string[];
  bookmarks: string[];
  tips: Tip[];
  createdAt: Date;
  updatedAt: Date;
  pfpUrl?: string;
  spendLimit?: number;
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

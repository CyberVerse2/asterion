import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Novels currently being read by Farcaster users
export async function GET() {
  try {
    // 1. Get all users with a non-null fid (Farcaster users)
    const farcasterUsers = await prisma.user.findMany({
      where: { NOT: { fid: null } },
      select: { id: true, fid: true }
    });
    if (!farcasterUsers || farcasterUsers.length === 0) {
      return NextResponse.json([]);
    }

    // 2. For each user, get their most recently read chapter (from reading_progress)
    const userNovelPairs: { userId: string; novelId: string }[] = [];
    for (const user of farcasterUsers) {
      const progress = await prisma.readingProgress.findFirst({
        where: { userId: user.id },
        orderBy: { lastReadAt: 'desc' },
        select: { chapterId: true }
      });
      if (progress && progress.chapterId) {
        // Get the chapter to find the novelId
        const chapter = await prisma.chapter.findUnique({
          where: { id: progress.chapterId },
          select: { novelId: true }
        });
        if (chapter && chapter.novelId) {
          userNovelPairs.push({ userId: user.id, novelId: chapter.novelId });
        }
      }
    }

    // 3. Aggregate unique novels and count how many Farcaster users are reading each
    const novelCounts: Record<string, { count: number; userIds: string[] }> = {};
    for (const pair of userNovelPairs) {
      if (!novelCounts[pair.novelId]) {
        novelCounts[pair.novelId] = { count: 0, userIds: [] };
      }
      novelCounts[pair.novelId].count++;
      novelCounts[pair.novelId].userIds.push(pair.userId);
    }
    const novelIds = Object.keys(novelCounts);
    if (novelIds.length === 0) {
      return NextResponse.json([]);
    }

    // 4. Fetch novel details
    const novels = await prisma.novel.findMany({
      where: { id: { in: novelIds } },
      select: { id: true, title: true, author: true, imageUrl: true }
    });

    // 5. Attach count to each novel
    const result = novels.map((novel) => ({
      ...novel,
      count: novelCounts[novel.id]?.count || 0
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/farcaster-reading] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Farcaster reading data' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Novels currently being read by Farcaster users
export async function GET() {
  try {
    // 1. Get all users with a non-null fid (Farcaster users)
    const farcasterUsers = await prisma.user.findMany({
      where: { NOT: { fid: null } },
      select: { id: true, fid: true, username: true, pfpUrl: true }
    });
    console.log('[farcaster-reading] farcasterUsers:', farcasterUsers);
    if (!farcasterUsers || farcasterUsers.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Batch get all reading progress for these users (most recent per user)
    const userIds = farcasterUsers.map((u) => u.id);
    console.log('[farcaster-reading] userIds:', userIds);
    const progressResults = await prisma.$runCommandRaw({
      aggregate: 'reading_progress',
      pipeline: [
        { $match: { userId: { $in: userIds } } },
        { $sort: { lastReadAt: -1 } },
        { $group: { _id: '$userId', progress: { $first: '$$ROOT' } } }
      ],
      cursor: {}
    });
    const progresses = (progressResults as any).cursor?.firstBatch || [];
    console.log('[farcaster-reading] progresses:', progresses);

    // 3. Batch get all chapters referenced
    const chapterIds = progresses.map((p: any) => p.progress.chapterId).filter(Boolean);
    console.log('[farcaster-reading] chapterIds:', chapterIds);
    const chapterResults = await prisma.$runCommandRaw({
      find: 'chapters',
      filter: { _id: { $in: chapterIds.map((id: string) => ({ $oid: id })) } },
      projection: { novel: 1 }
    });
    const chapters = (chapterResults as any).cursor?.firstBatch || [];
    console.log('[farcaster-reading] chapters:', chapters);
    const chapterIdToNovelId: Record<string, string> = {};
    chapters.forEach((ch: any) => {
      chapterIdToNovelId[ch._id?.$oid || ch._id] = ch.novel?.$oid || ch.novel;
    });
    console.log('[farcaster-reading] chapterIdToNovelId:', chapterIdToNovelId);

    // 4. Map userId to novelId
    const novelToUserIds: Record<string, string[]> = {};
    progresses.forEach((p: any) => {
      const chapterId = p.progress.chapterId;
      const novelId = chapterIdToNovelId[chapterId];
      if (novelId) {
        if (!novelToUserIds[novelId]) novelToUserIds[novelId] = [];
        novelToUserIds[novelId].push(p.progress.userId);
      }
    });
    const novelIds = Object.keys(novelToUserIds);
    console.log('[farcaster-reading] novelToUserIds:', novelToUserIds);
    if (novelIds.length === 0) {
      return NextResponse.json([]);
    }

    // 5. Fetch novel details
    const novels = await prisma.novel.findMany({
      where: { id: { in: novelIds } },
      select: {
        id: true,
        title: true,
        author: true,
        imageUrl: true,
        rank: true,
        rating: true
      }
    });
    console.log('[farcaster-reading] novels:', novels);

    // 6. Compute totalChapters for each novel
    const chaptersCount = await prisma.chapter.groupBy({
      by: ['novel'],
      where: { novel: { in: novelIds } },
      _count: { id: true }
    });
    const novelIdToChapters = Object.fromEntries(chaptersCount.map((c) => [c.novel, c._count.id]));

    // 7. Attach count, userIds, and totalChapters to each novel
    const result = novels.map((novel) => ({
      ...novel,
      count: novelToUserIds[novel.id]?.length || 0,
      userIds: novelToUserIds[novel.id] || [],
      totalChapters: novelIdToChapters[novel.id] || 0
    }));
    console.log('[farcaster-reading] result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/farcaster-reading] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Farcaster reading data' }, { status: 500 });
  }
}

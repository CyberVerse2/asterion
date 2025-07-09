import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const limitParam = url.searchParams.get('limit');
    const take = limitParam ? parseInt(limitParam) : 100;
    const novels = await prisma.novel.findMany({
      take,
      include: {
        tips: true // Include tips to calculate totalTips
      }
    });

    // For each novel, fetch the latest chapter
    const novelsWithLatest = await Promise.all(
      novels.map(async (novel: any) => {
        const latestChapter = await prisma.chapter.findFirst({
          where: { novel: novel.id },
          orderBy: [{ chapterNumber: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            updatedAt: true
          }
        });
        return {
          ...novel,
          totalTips: novel.tips.reduce((sum: number, tip: any) => sum + tip.amount, 0),
          tipCount: novel.tips.length,
          latestChapter: latestChapter
            ? {
                chapterNumber: latestChapter.chapterNumber,
                title: latestChapter.title,
                updatedAt: latestChapter.updatedAt
              }
            : null
        };
      })
    );

    // Sort by rank (convert to number for proper sorting)
    const sortedNovels = novelsWithLatest.sort((a: any, b: any) => {
      const rankA = parseInt(a.rank) || 999999; // Default to high number if rank is missing/invalid
      const rankB = parseInt(b.rank) || 999999;
      return rankA - rankB; // Ascending order (rank 1 first)
    });

    return NextResponse.json(sortedNovels);
  } catch (error) {
    console.error('Error fetching novels:', error);
    return NextResponse.json({ error: 'Failed to fetch novels' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, author, description, coverImage, chapters } = body;

    const newNovel = {
      id: Date.now().toString(),
      title,
      author,
      description,
      coverImage,
      totalTips: 0,
      tipCount: 0,
      loves: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      chapters: chapters.map((chapter: any, index: number) => ({
        id: `ch_${Date.now()}_${index}`,
        title: chapter.title,
        content: chapter.content,
        order: index + 1,
        loves: 0,
        novelId: Date.now().toString()
      })),
      tips: []
    };

    return NextResponse.json(newNovel);
  } catch (error) {
    console.error('Error creating novel:', error);
    return NextResponse.json({ error: 'Failed to create novel' }, { status: 500 });
  }
}

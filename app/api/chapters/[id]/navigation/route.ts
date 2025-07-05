import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const chapterId = params.id;
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction'); // 'prev' or 'next'

    // First, get the current chapter to know its novel and chapter number
    const currentChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        chapterNumber: true,
        novel: true
      }
    });

    if (!currentChapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    let targetChapter = null;

    if (direction === 'prev') {
      // Get previous chapter (lower chapter number)
      targetChapter = await prisma.chapter.findFirst({
        where: {
          novel: currentChapter.novel,
          chapterNumber: { lt: currentChapter.chapterNumber }
        },
        orderBy: { chapterNumber: 'desc' },
        select: {
          id: true,
          title: true,
          chapterNumber: true
        }
      });
    } else if (direction === 'next') {
      // Get next chapter (higher chapter number)
      targetChapter = await prisma.chapter.findFirst({
        where: {
          novel: currentChapter.novel,
          chapterNumber: { gt: currentChapter.chapterNumber }
        },
        orderBy: { chapterNumber: 'asc' },
        select: {
          id: true,
          title: true,
          chapterNumber: true
        }
      });
    }

    const response: any = {};

    if (direction === 'prev') {
      response.previousChapter = targetChapter;
    } else if (direction === 'next') {
      response.nextChapter = targetChapter;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching chapter navigation:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter navigation' }, { status: 500 });
  }
}

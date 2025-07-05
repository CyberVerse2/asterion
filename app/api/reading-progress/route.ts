import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Retrieve reading progress for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chapterId = searchParams.get('chapterId');
    const novelId = searchParams.get('novelId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let whereClause: any = { userId };

    if (chapterId) {
      // Get progress for a specific chapter
      whereClause.chapterId = chapterId;
    } else if (novelId) {
      // Get progress for all chapters in a novel
      whereClause.chapter = {
        novel: novelId
      };
    }

    const readingProgress = await prisma.readingProgress.findMany({
      where: whereClause,
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            chapterNumber: true,
            novel: true
          }
        }
      },
      orderBy: {
        lastReadAt: 'desc'
      }
    });

    return NextResponse.json(readingProgress);
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading progress' },
      { status: 500 }
    );
  }
}

// POST - Save/update reading progress
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      chapterId,
      currentLine,
      totalLines,
      progressPercentage,
      scrollPosition
    } = body;

    // Validate required fields
    if (!userId || !chapterId) {
      return NextResponse.json(
        { error: 'userId and chapterId are required' },
        { status: 400 }
      );
    }

    // Validate that user and chapter exist
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Calculate progress percentage if not provided
    const calculatedProgressPercentage = 
      progressPercentage !== undefined 
        ? progressPercentage 
        : totalLines > 0 
          ? Math.round((currentLine / totalLines) * 100) 
          : 0;

    // Upsert reading progress (create or update)
    const readingProgress = await prisma.readingProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId
        }
      },
      update: {
        currentLine: currentLine || 0,
        totalLines: totalLines || 0,
        progressPercentage: calculatedProgressPercentage,
        scrollPosition: scrollPosition || 0,
        lastReadAt: new Date()
      },
      create: {
        userId,
        chapterId,
        currentLine: currentLine || 0,
        totalLines: totalLines || 0,
        progressPercentage: calculatedProgressPercentage,
        scrollPosition: scrollPosition || 0,
        lastReadAt: new Date()
      },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            chapterNumber: true,
            novel: true
          }
        }
      }
    });

    return NextResponse.json({
      status: 'success',
      readingProgress
    });
  } catch (error) {
    console.error('Error saving reading progress:', error);
    return NextResponse.json(
      { error: 'Failed to save reading progress' },
      { status: 500 }
    );
  }
}

// DELETE - Remove reading progress (optional, for cleanup)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chapterId = searchParams.get('chapterId');

    if (!userId || !chapterId) {
      return NextResponse.json(
        { error: 'userId and chapterId are required' },
        { status: 400 }
      );
    }

    await prisma.readingProgress.delete({
      where: {
        userId_chapterId: {
          userId,
          chapterId
        }
      }
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error deleting reading progress:', error);
    return NextResponse.json(
      { error: 'Failed to delete reading progress' },
      { status: 500 }
    );
  }
} 
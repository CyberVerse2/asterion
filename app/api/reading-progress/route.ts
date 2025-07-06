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

    let filter: any = { userId };

    if (chapterId) {
      // Get progress for a specific chapter
      filter.chapterId = chapterId;
    } else if (novelId) {
      // Get progress for all chapters in a novel
      filter.chapter = {
        novel: novelId
      };
    }

    // Use raw MongoDB collection for now to bypass Prisma client issue
    const readingProgress = await prisma.$runCommandRaw({
      find: 'reading_progress',
      filter: filter,
      sort: { lastReadAt: -1 }
    });

    console.log('[ReadingProgress API] GET result:', readingProgress);

    // Extract the documents from the cursor
    const documents = (readingProgress as any).cursor?.firstBatch || [];
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    return NextResponse.json({ error: 'Failed to fetch reading progress' }, { status: 500 });
  }
}

// POST - Save/update reading progress
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, chapterId, currentLine, totalLines, progressPercentage, scrollPosition } = body;

    console.log('[ReadingProgress API] POST request received:', {
      userId,
      chapterId,
      currentLine,
      totalLines,
      progressPercentage,
      scrollPosition
    });

    // Validate required fields
    if (!userId || !chapterId) {
      console.log('[ReadingProgress API] Validation failed: missing userId or chapterId');
      return NextResponse.json({ error: 'userId and chapterId are required' }, { status: 400 });
    }

    // Validate that user and chapter exist
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('[ReadingProgress API] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      console.log('[ReadingProgress API] Chapter not found:', chapterId);
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Calculate progress percentage if not provided
    const calculatedProgressPercentage =
      progressPercentage !== undefined
        ? progressPercentage
        : totalLines > 0
        ? Math.round((currentLine / totalLines) * 100)
        : 0;

    console.log(
      '[ReadingProgress API] Upserting progress with calculated percentage:',
      calculatedProgressPercentage
    );

    // Use raw MongoDB upsert to bypass Prisma client issue
    const now = new Date();
    const progressData = {
      userId,
      chapterId,
      currentLine: currentLine || 0,
      totalLines: totalLines || 0,
      progressPercentage: calculatedProgressPercentage,
      scrollPosition: scrollPosition || 0,
      lastReadAt: now,
      updatedAt: now
    };

    const result = await prisma.$runCommandRaw({
      update: 'reading_progress',
      updates: [
        {
          q: { userId, chapterId },
          u: { $set: progressData },
          upsert: true
        }
      ]
    });

    console.log('[ReadingProgress API] Successfully saved progress:', result);

    return NextResponse.json({
      status: 'success',
      readingProgress: progressData
    });
  } catch (error) {
    console.error('Error saving reading progress:', error);
    return NextResponse.json({ error: 'Failed to save reading progress' }, { status: 500 });
  }
}

// DELETE - Remove reading progress (optional, for cleanup)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chapterId = searchParams.get('chapterId');

    if (!userId || !chapterId) {
      return NextResponse.json({ error: 'userId and chapterId are required' }, { status: 400 });
    }

    // Use raw MongoDB delete to bypass Prisma client issue
    const result = await prisma.$runCommandRaw({
      delete: 'reading_progress',
      deletes: [
        {
          q: { userId, chapterId },
          limit: 1
        }
      ]
    });

    return NextResponse.json({ status: 'success', result });
  } catch (error) {
    console.error('Error deleting reading progress:', error);
    return NextResponse.json({ error: 'Failed to delete reading progress' }, { status: 500 });
  }
}

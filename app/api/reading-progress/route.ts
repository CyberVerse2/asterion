import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Retrieve reading progress for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chapterId = searchParams.get('chapterId');
    const novelId = searchParams.get('novelId');

    console.log('[ReadingProgress API] GET request params:', { userId, chapterId, novelId });

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let filter: any = { userId: userId };

    if (chapterId) {
      // Get progress for a specific chapter
      filter.chapterId = chapterId;
    } else if (novelId) {
      // Get progress for all chapters in a specific novel
      const chapters = await prisma.$runCommandRaw({
        find: 'chapters',
        filter: { novel: { $oid: novelId } },
        projection: { _id: 1, novel: 1 }
      });

      const chapterIds =
        (chapters as any).cursor?.firstBatch?.map((ch: any) => ch._id.$oid || ch._id) || [];

      if (chapterIds.length === 0) {
        return NextResponse.json([]);
      }

      // Then get reading progress for those chapter IDs
      filter.chapterId = { $in: chapterIds };
    }
    // If no novelId or chapterId, get all progress for the user (for recently read section)

    // Use raw MongoDB collection for now to bypass Prisma client issue
    const readingProgress = await prisma.$runCommandRaw({
      find: 'reading_progress',
      filter: filter,
      sort: { lastReadAt: -1 }
    });

    // Extract the documents from the cursor
    const documents = (readingProgress as any).cursor?.firstBatch || [];

    // If we're fetching all user progress (for recently read), we need to add novelId
    if (!novelId && !chapterId) {
      console.log('[ReadingProgress API] Fetching all user progress, adding novelId field');

      // For each progress entry, we need to get the novelId from the chapter
      const progressWithNovelIds = await Promise.all(
        documents.map(async (progress: any) => {
          try {
            const chapter = await prisma.$runCommandRaw({
              find: 'chapters',
              filter: { _id: { $oid: progress.chapterId } },
              projection: { novel: 1, chapterNumber: 1, order: 1 }
            });

            const chapterData = (chapter as any).cursor?.firstBatch?.[0];
            if (chapterData) {
              return {
                ...progress,
                novelId: chapterData.novel?.$oid || chapterData.novel,
                chapterNumber: chapterData.chapterNumber || chapterData.order || 0
              };
            }
            return progress;
          } catch (error) {
            console.error('Error fetching chapter for progress:', error);
            return progress;
          }
        })
      );

      console.log('[ReadingProgress API] Progress with novelIds:', progressWithNovelIds);
      return NextResponse.json(progressWithNovelIds);
    }

    console.log('[ReadingProgress API] Returning documents:', documents);
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
      userId: userId,
      chapterId: chapterId,
      currentLine: currentLine || 0,
      totalLines: totalLines || 0,
      progressPercentage: calculatedProgressPercentage,
      scrollPosition: scrollPosition || 0,
      lastReadAt: now,
      updatedAt: now
    };

    console.log('[ReadingProgress API] Saving progress data:', progressData);

    const result = await prisma.$runCommandRaw({
      update: 'reading_progress',
      updates: [
        {
          q: { userId: userId, chapterId: chapterId },
          u: { $set: progressData },
          upsert: true
        }
      ]
    });

    console.log('[ReadingProgress API] Successfully saved progress:', result);

    // Debug: Let's verify what was actually saved
    const savedProgress = await prisma.$runCommandRaw({
      find: 'reading_progress',
      filter: { userId: userId, chapterId: chapterId },
      limit: 1
    });
    console.log(
      '[ReadingProgress API] Verified saved progress:',
      (savedProgress as any).cursor?.firstBatch
    );

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

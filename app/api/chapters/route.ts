import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!novelId) {
      return NextResponse.json({ error: 'novelId is required' }, { status: 400 });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await prisma.chapter.count({
      where: { novel: novelId }
    });

    // Fetch paginated chapters
    const chapters = await prisma.chapter.findMany({
      where: { novel: novelId },
      orderBy: { chapterNumber: 'asc' },
      skip: offset,
      take: limit
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      chapters,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}

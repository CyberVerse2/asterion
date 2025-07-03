import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId');
    if (!novelId) {
      return NextResponse.json({ error: 'novelId is required' }, { status: 400 });
    }
    const chapters = await prisma.chapter.findMany({
      where: { novel: novelId },
      orderBy: { chapterNumber: 'asc' }
    });
    console.log('Fetched chapters:', chapters);
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}

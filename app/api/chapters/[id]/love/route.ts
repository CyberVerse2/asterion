import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get current tip count and increment manually (Prisma increment doesn't work reliably with MongoDB)
    const currentChapter = await prisma.chapter.findUnique({
      where: { id: params.id }
    });
    const newTipCount = (currentChapter?.tipCount || 0) + 1;

    // Increment tipCount in the database
    const chapter = await prisma.chapter.update({
      where: { id: params.id },
      data: { tipCount: newTipCount }
    });
    return NextResponse.json({ tipCount: chapter.tipCount });
  } catch (error) {
    console.error('Error updating chapter loves:', error);
    return NextResponse.json({ error: 'Failed to update loves' }, { status: 500 });
  }
}

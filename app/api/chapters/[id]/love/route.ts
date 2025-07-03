import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {

    // Increment tipCount in the database
    const chapter = await prisma.chapter.update({
      where: { id: params.id },
      data: { tipCount: { increment: 1 } }
    });
    return NextResponse.json({ tipCount: chapter.tipCount });
  } catch (error) {
    console.error('Error updating chapter loves:', error);
    return NextResponse.json({ error: 'Failed to update loves' }, { status: 500 });
  }
}

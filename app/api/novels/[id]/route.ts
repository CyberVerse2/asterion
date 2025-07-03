import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const novel = await prisma.novel.findUnique({
      where: { id: params.id }
    });

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    return NextResponse.json(novel);
  } catch (error) {
    console.error('Error fetching novel:', error);
    return NextResponse.json({ error: 'Failed to fetch novel' }, { status: 500 });
  }
}

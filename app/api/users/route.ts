import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { fid, username } = await req.json();
    if (!fid || !username) {
      return NextResponse.json({ error: 'fid and username are required' }, { status: 400 });
    }

    // Try to find the user by fid or username
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ fid: Number(fid) }, { username: username }]
      }
    });

    // If not found, create the user
    if (!user) {
      user = await prisma.user.create({
        data: {
          fid: Number(fid),
          username: username
        }
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

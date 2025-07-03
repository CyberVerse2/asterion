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

export async function PATCH(req: NextRequest) {
  try {
    const { userId, novelId } = await req.json();
    if (!userId || !novelId) {
      return NextResponse.json({ error: 'userId and novelId are required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add novelId to bookmarks if not already present
    const bookmarks = Array.isArray(user.bookmarks) ? user.bookmarks : [];
    if (!bookmarks.includes(novelId)) {
      bookmarks.push(novelId);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { bookmarks }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

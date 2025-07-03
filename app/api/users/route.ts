import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log('[POST /api/users] Incoming request');
  try {
    const { fid, username, pfpUrl } = await req.json();
    console.log('[POST /api/users] Payload:', { fid, username, pfpUrl });
    if (!fid || !username) {
      return NextResponse.json({ error: 'fid and username are required' }, { status: 400 });
    }

    // Try to find the user by fid or username
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ fid: Number(fid) }, { username: username }]
      }
    });
    console.log('[POST /api/users] Found user:', user);

    // If not found, create the user
    if (!user) {
      user = await prisma.user.create({
        data: {
          fid: Number(fid),
          username: username,
          ...(pfpUrl ? { pfpUrl } : {})
        }
      });
      console.log('[POST /api/users] Created new user:', user);
    }

    const response = NextResponse.json(user);
    console.log('[POST /api/users] Response:', user);
    return response;
  } catch (error) {
    console.error('[POST /api/users] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  console.log('[PATCH /api/users] Incoming request');
  try {
    const { userId, novelId, dailyLimit, monthlyLimit } = await req.json();
    console.log('[PATCH /api/users] Payload:', { userId, novelId, dailyLimit, monthlyLimit });
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log('[PATCH /api/users] Found user:', user);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If novelId is present, update bookmarks as before
    let updateData: any = {};
    if (novelId) {
      const bookmarks = Array.isArray(user.bookmarks) ? user.bookmarks : [];
      if (!bookmarks.includes(novelId)) {
        bookmarks.push(novelId);
      }
      updateData.bookmarks = bookmarks;
    }
    // If dailyLimit or monthlyLimit is present, update those fields
    if (typeof dailyLimit === 'number') {
      updateData.dailyLimit = dailyLimit;
    }
    if (typeof monthlyLimit === 'number') {
      updateData.monthlyLimit = monthlyLimit;
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    console.log('[PATCH /api/users] Updated user:', updatedUser);

    const response = NextResponse.json(updatedUser);
    console.log('[PATCH /api/users] Response:', updatedUser);
    return response;
  } catch (error) {
    console.error('[PATCH /api/users] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

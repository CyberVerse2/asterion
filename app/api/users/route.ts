import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Utility to deeply convert BigInt values to strings
function deepBigIntToString(obj: any): any {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(deepBigIntToString);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepBigIntToString(v)]));
  }
  return obj;
}

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
    const { userId, spendLimit, novelId, spendPermission, spendPermissionSignature } =
      await req.json();
    console.log('[PATCH /api/users] Payload:', {
      userId,
      spendLimit,
      novelId,
      spendPermission,
      spendPermissionSignature
    });
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log('[PATCH /api/users] Found user:', user);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (typeof spendLimit === 'number') {
      updateData.spendLimit = spendLimit;
    }
    if (spendPermission) {
      updateData.spendPermission = deepBigIntToString(spendPermission);
    }
    if (spendPermissionSignature) {
      updateData.spendPermissionSignature = spendPermissionSignature;
    }

    let updatedUser = user;
    if (Object.keys(updateData).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    // Optionally handle bookmarks (legacy)
    if (novelId) {
      if (!user.bookmarks.includes(novelId)) {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { bookmarks: { push: novelId } }
        });
      }
    }

    return NextResponse.json(updatedUser);
  } catch (e) {
    console.error('[PATCH /api/users] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

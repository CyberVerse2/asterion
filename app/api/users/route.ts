import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Utility to deeply convert BigInt values to strings
function deepBigIntToString(obj: any): any {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(deepBigIntToString);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepBigIntToString(v)]));
  }
  return obj;
}

export async function GET(req: NextRequest) {
  console.log('[GET /api/users] Incoming request');
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Fetch user with tips included
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tips: {
          include: {
            novel: {
              select: {
                id: true,
                title: true
              }
            },
            chapter: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[GET /api/users] Found user with tips:', user);
    return NextResponse.json(user);
  } catch (error) {
    console.error('[GET /api/users] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log('[POST /api/users] Incoming request');
  try {
    const { fid, username, pfpUrl } = await req.json();
    console.log('[POST /api/users] Payload:', { fid, username, pfpUrl });
    if (!fid || !username) {
      return NextResponse.json({ error: 'fid and username are required' }, { status: 400 });
    }

    // Try to find the user by fid or username with tips included
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ fid: Number(fid) }, { username: username }]
      },
      include: {
        tips: {
          include: {
            novel: {
              select: {
                id: true,
                title: true
              }
            },
            chapter: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
    console.log('[POST /api/users] Found user:', user);

    // If not found, create the user and fetch with tips
    if (!user) {
      const newUser = await prisma.user.create({
        data: {
          fid: Number(fid),
          username: username,
          ...(pfpUrl ? { pfpUrl } : {})
        }
      });

      // Fetch the created user with tips included
      user = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: {
          tips: {
            include: {
              novel: {
                select: {
                  id: true,
                  title: true
                }
              }
            },
            orderBy: {
              date: 'desc'
            }
          }
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
      const safePermission = deepBigIntToString(spendPermission);
      console.log('[PATCH /api/users] Storing spendPermission:', safePermission);
      console.log('[PATCH /api/users] spendPermission type:', typeof safePermission);
      console.log('[PATCH /api/users] spendPermission keys:', Object.keys(safePermission));
      updateData.spendPermission = safePermission;
    }
    if (spendPermissionSignature) {
      console.log('[PATCH /api/users] Storing spendPermissionSignature:', spendPermissionSignature);
      updateData.spendPermissionSignature = spendPermissionSignature;
    }

    let updatedUser = user;
    if (Object.keys(updateData).length > 0) {
      console.log('[PATCH /api/users] updateData to be saved:', updateData);
      console.log('[PATCH /api/users] updateData keys:', Object.keys(updateData));
      console.log('[PATCH /api/users] About to call prisma.user.update with:');
      console.log('[PATCH /api/users] - where:', { id: userId });
      console.log('[PATCH /api/users] - data:', updateData);

      try {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData
        });
        console.log('[PATCH /api/users] Updated user successful:', updatedUser);
      } catch (updateError) {
        console.error('[PATCH /api/users] Prisma update error details:', updateError);
        throw updateError; // Re-throw to trigger the outer catch
      }
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

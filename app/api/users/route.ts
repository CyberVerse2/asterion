import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateUniqueUsername } from '@/lib/username-generator';

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
          },
          take: 5
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
    const { fid, username, pfpUrl, walletAddress } = await req.json();
    console.log('[POST /api/users] Payload:', { fid, username, pfpUrl, walletAddress });

    // Validate input: either (fid AND username) OR walletAddress must be provided
    if ((!fid || !username) && !walletAddress) {
      return NextResponse.json(
        {
          error: 'Either (fid and username) or walletAddress is required'
        },
        { status: 400 }
      );
    }

    // Helper function to check username uniqueness
    const checkUsernameUniqueness = async (usernameToCheck: string): Promise<boolean> => {
      const existingUser = await prisma.user.findUnique({
        where: { username: usernameToCheck }
      });
      return !existingUser; // Returns true if username is unique
    };

    // Helper function to check wallet address uniqueness
    const checkWalletAddressUniqueness = async (addressToCheck: string): Promise<boolean> => {
      const existingUser = await prisma.user.findFirst({
        where: { walletAddress: addressToCheck }
      });
      return !existingUser; // Returns true if wallet address is unique
    };

    let user = null;

    // First, try to find user by fid if provided (most specific)
    if (fid) {
      user = await prisma.user.findUnique({
        where: { fid: Number(fid) },
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
            },
            take: 5
          }
        }
      });
      console.log('[POST /api/users] Found user by fid:', user);
    }

    // If no user found by fid, try by walletAddress
    if (!user && walletAddress) {
      user = await prisma.user.findFirst({
        where: { walletAddress: walletAddress },
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
            },
            take: 5
          }
        }
      });
      console.log('[POST /api/users] Found user by wallet address:', user);
    }

    // If no user found by fid or walletAddress, try by username as fallback
    if (!user && username) {
      user = await prisma.user.findUnique({
        where: { username: username },
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
            },
            take: 5
          }
        }
      });
      console.log('[POST /api/users] Found user by username:', user);
    }

    // Handle existing user without wallet address - update with current wallet
    if (user && !user.walletAddress && walletAddress) {
      console.log('[POST /api/users] Updating existing user with wallet address');

      // Check if this wallet address is already associated with another user
      const isWalletUnique = await checkWalletAddressUniqueness(walletAddress);
      if (!isWalletUnique) {
        const conflictingUser = await prisma.user.findFirst({
          where: { walletAddress: walletAddress }
        });
        console.log('[POST /api/users] Wallet address conflict detected');
        return NextResponse.json(
          {
            error: 'This wallet address is already associated with another user',
            conflictingUser: { id: conflictingUser?.id, username: conflictingUser?.username }
          },
          { status: 409 }
        );
      }

      // Update user with wallet address
      user = await prisma.user.update({
        where: { id: user.id },
        data: { walletAddress: walletAddress },
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
            },
            take: 5
          }
        }
      });
      console.log('[POST /api/users] Updated existing user with wallet address:', user);
    }

    // If user exists, return them (no need to create)
    if (user) {
      console.log('[POST /api/users] Returning existing user:', user);
      return NextResponse.json(user);
    }

    // If not found, create the user
    const userData: any = {};

    // Handle Farcaster user creation
    if (fid && username) {
      // Double-check that fid doesn't exist before creating
      const existingUserWithFid = await prisma.user.findUnique({
        where: { fid: Number(fid) }
      });

      if (existingUserWithFid) {
        console.log('[POST /api/users] User with fid already exists, returning existing user');
        return NextResponse.json(existingUserWithFid);
      }

      userData.fid = Number(fid);
      userData.username = username;
      if (pfpUrl) userData.pfpUrl = pfpUrl;
      if (walletAddress) {
        // Check wallet address uniqueness before creating
        const isWalletUnique = await checkWalletAddressUniqueness(walletAddress);
        if (!isWalletUnique) {
          const conflictingUser = await prisma.user.findFirst({
            where: { walletAddress: walletAddress }
          });
          console.log('[POST /api/users] Wallet address conflict during creation');
          return NextResponse.json(
            {
              error: 'This wallet address is already associated with another user',
              conflictingUser: { id: conflictingUser?.id, username: conflictingUser?.username }
            },
            { status: 409 }
          );
        }
        userData.walletAddress = walletAddress;
      }
    }
    // Handle wallet-only user creation
    else if (walletAddress) {
      // Check wallet address uniqueness before creating
      const isWalletUnique = await checkWalletAddressUniqueness(walletAddress);
      if (!isWalletUnique) {
        const conflictingUser = await prisma.user.findFirst({
          where: { walletAddress: walletAddress }
        });
        console.log('[POST /api/users] Wallet address conflict during wallet-only user creation');
        return NextResponse.json(
          {
            error: 'This wallet address is already associated with another user',
            conflictingUser: { id: conflictingUser?.id, username: conflictingUser?.username }
          },
          { status: 409 }
        );
      }

      userData.walletAddress = walletAddress;
      // Generate unique username for wallet-only user
      try {
        userData.username = await generateUniqueUsername(checkUsernameUniqueness);
        console.log('[POST /api/users] Generated username for wallet user:', userData.username);
      } catch (error) {
        console.error('[POST /api/users] Username generation failed:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate unique username'
          },
          { status: 500 }
        );
      }
    }

    try {
      const newUser = await prisma.user.create({
        data: userData
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
            },
            take: 5
          }
        }
      });
      console.log('[POST /api/users] Created new user:', user);
    } catch (error: any) {
      // Handle unique constraint violations specifically
      if (error.code === 'P2002' && error.meta?.target?.includes('fid')) {
        console.log('[POST /api/users] Unique constraint violation on fid, fetching existing user');
        // If there's a unique constraint violation on fid, fetch the existing user
        const existingUser = await prisma.user.findUnique({
          where: { fid: Number(fid) },
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
              },
              take: 5
            }
          }
        });

        if (existingUser) {
          console.log(
            '[POST /api/users] Returning existing user after constraint violation:',
            existingUser
          );
          return NextResponse.json(existingUser);
        }
      }

      // Re-throw if it's not a fid constraint violation or if user still not found
      throw error;
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
    const {
      userId,
      spendLimit,
      chapterTipAmount,
      novelId,
      spendPermission,
      spendPermissionSignature,
      walletAddress
    } = await req.json();
    console.log('[PATCH /api/users] Payload:', {
      userId,
      spendLimit,
      chapterTipAmount,
      novelId,
      spendPermission,
      spendPermissionSignature,
      walletAddress
    });
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Helper function to check wallet address uniqueness
    const checkWalletAddressUniqueness = async (
      addressToCheck: string,
      excludeUserId: string
    ): Promise<boolean> => {
      const existingUser = await prisma.user.findFirst({
        where: {
          walletAddress: addressToCheck,
          id: { not: excludeUserId } // Exclude current user
        }
      });
      return !existingUser; // Returns true if wallet address is unique
    };

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
    if (typeof chapterTipAmount === 'number') {
      updateData.chapterTipAmount = chapterTipAmount;
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
    if (walletAddress) {
      // Check if this wallet address is already associated with another user
      const isWalletUnique = await checkWalletAddressUniqueness(walletAddress, userId);
      if (!isWalletUnique) {
        const conflictingUser = await prisma.user.findFirst({
          where: {
            walletAddress: walletAddress,
            id: { not: userId } // Exclude current user
          }
        });
        console.log('[PATCH /api/users] Wallet address conflict detected');
        return NextResponse.json(
          {
            error: 'This wallet address is already associated with another user',
            conflictingUser: { id: conflictingUser?.id, username: conflictingUser?.username }
          },
          { status: 409 }
        );
      }

      updateData.walletAddress = walletAddress;
      console.log('[PATCH /api/users] Adding wallet address to update:', walletAddress);
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

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
  try {
    const { fid, username, pfpUrl, walletAddress, usernames, userIds } = await req.json();

    // Batch user profile fetch by userIds
    if (Array.isArray(userIds)) {
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds }
        },
        select: {
          id: true,
          username: true,
          pfpUrl: true
        }
      });
      return NextResponse.json(users);
    }

    // Batch user profile fetch by usernames (case-insensitive)
    if (Array.isArray(usernames)) {
      const users = await prisma.user.findMany({
        where: {
          username: {
            in: usernames,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          username: true,
          pfpUrl: true
        }
      });
      return NextResponse.json(users);
    }

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
    }

    // Handle existing user without wallet address - update with current wallet
    if (user && !user.walletAddress && walletAddress) {
      // Check if this wallet address is already associated with another user
      const isWalletUnique = await checkWalletAddressUniqueness(walletAddress);
      if (!isWalletUnique) {
        const conflictingUser = await prisma.user.findFirst({
          where: { walletAddress: walletAddress }
        });
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
    }

    // If user exists, return them (no need to create)
    if (user) {
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
    } catch (error: any) {
      // Handle unique constraint violations specifically
      if (error.code === 'P2002' && error.meta?.target?.includes('fid')) {
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
          return NextResponse.json(existingUser);
        }
      }

      // Re-throw if it's not a fid constraint violation or if user still not found
      throw error;
    }

    const response = NextResponse.json(user);
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
  try {
    const {
      userId,
      spendLimit,
      chapterTipAmount,
      novelId,
      spendPermission,
      spendPermissionSignature,
      walletAddress,
      hasAddedMiniapp
    } = await req.json();

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
    if (typeof hasAddedMiniapp === 'boolean') {
      updateData.hasAddedMiniapp = hasAddedMiniapp;
    }
    if (spendPermission) {
      const safePermission = deepBigIntToString(spendPermission);
      updateData.spendPermission = safePermission;
    }
    if (spendPermissionSignature) {
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
        return NextResponse.json(
          {
            error: 'This wallet address is already associated with another user',
            conflictingUser: { id: conflictingUser?.id, username: conflictingUser?.username }
          },
          { status: 409 }
        );
      }

      updateData.walletAddress = walletAddress;
    }

    let updatedUser = user;
    if (Object.keys(updateData).length > 0) {
      try {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData
        });
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

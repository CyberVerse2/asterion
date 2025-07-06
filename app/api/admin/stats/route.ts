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
  console.log('[GET /api/admin/stats] Incoming request');

  try {
    // Get current date and calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total user count
    const totalUsers = await prisma.user.count();

    // Get users created today
    const usersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    // Get users created yesterday
    const usersYesterday = await prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today
        }
      }
    });

    // Get users created this week
    const usersThisWeek = await prisma.user.count({
      where: {
        createdAt: {
          gte: lastWeek
        }
      }
    });

    // Get users created this month
    const usersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: lastMonth
        }
      }
    });

    // Get active users (users with reading progress in the last 7 days)
    const activeUsers = await prisma.$runCommandRaw({
      aggregate: 'reading_progress',
      cursor: {},
      pipeline: [
        {
          $match: {
            lastReadAt: {
              $gte: lastWeek.toISOString()
            }
          }
        },
        {
          $group: {
            _id: '$userId'
          }
        },
        {
          $count: 'activeUsers'
        }
      ]
    });

    const activeUsersCount = (activeUsers as any).cursor?.firstBatch?.[0]?.activeUsers || 0;

    // Get users with bookmarks
    const usersWithBookmarks = await prisma.user.count({
      where: {
        bookmarks: {
          isEmpty: false
        }
      }
    });

    // Get users who have tipped
    const usersWhoTipped = await prisma.tip.groupBy({
      by: ['userId'],
      _count: {
        userId: true
      }
    });

    const tippingUsersCount = usersWhoTipped.length;

    // Get total tips amount
    const totalTipsResult = await prisma.tip.aggregate({
      _sum: {
        amount: true
      }
    });

    const totalTipsAmount = totalTipsResult._sum.amount || 0;

    // Get user growth over time (last 30 days)
    const userGrowthData = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: lastMonth
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get top users by tips given
    const topTippersResult = await prisma.$runCommandRaw({
      aggregate: 'user',
      cursor: {},
      pipeline: [
        {
          $lookup: {
            from: 'tip',
            localField: '_id',
            foreignField: 'userId',
            as: 'tips'
          }
        },
        {
          $addFields: {
            tipsCount: { $size: '$tips' }
          }
        },
        {
          $match: {
            tipsCount: { $gt: 0 }
          }
        },
        {
          $sort: {
            tipsCount: -1
          }
        },
        {
          $limit: 10
        },
        {
          $project: {
            _id: 1,
            username: 1,
            pfpUrl: 1,
            tipsCount: 1
          }
        }
      ]
    });

    const topTippers = (topTippersResult as any).cursor?.firstBatch || [];

    // Get user engagement stats
    const totalReadingProgress = await prisma.$runCommandRaw({
      count: 'reading_progress'
    });

    const totalReadingProgressCount = (totalReadingProgress as any).n || 0;

    // Calculate engagement rate (users with reading progress / total users)
    const engagementRate = totalUsers > 0 ? (activeUsersCount / totalUsers) * 100 : 0;

    // Compile statistics
    const stats = {
      overview: {
        totalUsers,
        activeUsers: activeUsersCount,
        engagementRate: Math.round(engagementRate * 100) / 100, // Round to 2 decimal places
        totalTipsAmount: deepBigIntToString(totalTipsAmount),
        totalReadingProgress: totalReadingProgressCount
      },
      growth: {
        today: usersToday,
        yesterday: usersYesterday,
        thisWeek: usersThisWeek,
        thisMonth: usersThisMonth,
        growthRate: usersYesterday > 0 ? ((usersToday - usersYesterday) / usersYesterday) * 100 : 0
      },
      engagement: {
        usersWithBookmarks,
        usersWhoTipped: tippingUsersCount,
        tippingRate: totalUsers > 0 ? (tippingUsersCount / totalUsers) * 100 : 0,
        bookmarkRate: totalUsers > 0 ? (usersWithBookmarks / totalUsers) * 100 : 0
      },
      topTippers: topTippers.map((user) => ({
        id: user._id,
        username: user.username,
        pfpUrl: user.pfpUrl,
        tipsCount: user.tipsCount
      })),
      userGrowth: userGrowthData.map((day) => ({
        date: day.createdAt.toISOString().split('T')[0],
        newUsers: day._count.id
      }))
    };

    console.log('[GET /api/admin/stats] Returning stats:', stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[GET /api/admin/stats] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

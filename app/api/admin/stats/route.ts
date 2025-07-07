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

    // Debug: Print first 5 users and their createdAt types
    const debugUsers = await prisma.user.findMany({
      select: { id: true, createdAt: true },
      take: 5,
      orderBy: { createdAt: 'asc' }
    });
    console.log(
      '[DEBUG] First 5 users:',
      debugUsers.map((u) => ({ id: u.id, createdAt: u.createdAt, type: typeof u.createdAt }))
    );

    // Debug: Print users created in the last 30 days
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: lastMonth } },
      select: { id: true, createdAt: true }
    });
    console.log('[DEBUG] Users created in last 30 days:', recentUsers);

    // Get user growth over time (last 30 days), grouped by day
    const userGrowthRaw = await prisma.$runCommandRaw({
      aggregate: 'user',
      cursor: {},
      pipeline: [
        {
          $match: {
            createdAt: { $gte: lastMonth }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]
    });
    const userGrowth =
      (userGrowthRaw as any).cursor?.firstBatch?.map((d: any) => ({
        date: d._id,
        newUsers: d.newUsers
      })) || [];

    // Calculate previous total users (as of yesterday)
    const previousTotalUsers = await prisma.user.count({
      where: {
        createdAt: { lt: today }
      }
    });

    // Fix growthRate calculation
    let growthRate = 0;
    if (usersYesterday === 0 && usersToday > 0) {
      growthRate = 100;
    } else if (usersYesterday > 0) {
      growthRate = ((usersToday - usersYesterday) / usersYesterday) * 100;
    } else {
      growthRate = 0;
    }

    // Get top users by tips given (count and total amount)
    console.log('[DEBUG] Starting top tippers query...');

    // Get users with their tip counts and total tipped amount using groupBy
    const usersWithTipStats = await prisma.tip.groupBy({
      by: ['userId'],
      _count: {
        userId: true
      },
      _sum: {
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: 10
    });

    console.log('[DEBUG] Users with tip stats:', usersWithTipStats);

    // Get the actual user data for these users
    const topTippers = await Promise.all(
      usersWithTipStats.map(async (tipData) => {
        const user = await prisma.user.findUnique({
          where: { id: tipData.userId },
          select: {
            id: true,
            username: true,
            pfpUrl: true
          }
        });
        return {
          id: user?.id || tipData.userId,
          username: user?.username || 'Unknown User',
          pfpUrl: user?.pfpUrl || null,
          tipsCount: tipData._count.userId,
          totalTipped: tipData._sum.amount || 0
        };
      })
    );

    console.log('[DEBUG] Top tippers final result:', topTippers);

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
        previousTotalUsers,
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
        growthRate
      },
      engagement: {
        usersWithBookmarks,
        usersWhoTipped: tippingUsersCount,
        tippingRate: totalUsers > 0 ? (tippingUsersCount / totalUsers) * 100 : 0,
        bookmarkRate: totalUsers > 0 ? (usersWithBookmarks / totalUsers) * 100 : 0
      },
      topTippers: topTippers,
      userGrowth
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

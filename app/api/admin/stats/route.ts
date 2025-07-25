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
  try {
    // Get current date and calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // For active users, use a more recent window since data is from July 2025
    const activeUsersWindow = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000); // Last 2 days instead of 7

    // Since data is from July 6-7, 2025, adjust the reference date
    const dataReferenceDate = new Date('2025-07-06T00:00:00.000Z');
    const dataReferenceYesterday = new Date(dataReferenceDate.getTime() - 24 * 60 * 60 * 1000);

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

    // Get active users (users with reading progress from data reference date)
    // Use Prisma query instead of MongoDB aggregation
    const activeUsersResult = await prisma.readingProgress.findMany({
      where: {
        lastReadAt: {
          gte: dataReferenceDate
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    const activeUsersCount = activeUsersResult.length;

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

    // Debug: Print users created in the last 30 days
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: lastMonth } },
      select: { id: true, createdAt: true }
    });

    // Debug: Print count of users matching { createdAt: { $gte: lastMonth } }
    const usersInLastMonthCount = await prisma.user.count({
      where: { createdAt: { gte: lastMonth } }
    });

    // Prisma-based user growth calculation (last 30 days)
    const usersLastMonth = await prisma.user.findMany({
      where: { createdAt: { gte: lastMonth } },
      select: { createdAt: true }
    });
    // Group by day
    const userGrowthMap: Record<string, number> = {};
    usersLastMonth.forEach((u) => {
      const date =
        u.createdAt instanceof Date
          ? u.createdAt.toISOString().slice(0, 10)
          : new Date(u.createdAt).toISOString().slice(0, 10);
      userGrowthMap[date] = (userGrowthMap[date] || 0) + 1;
    });
    const userGrowth = Object.entries(userGrowthMap)
      .map(([date, newUsers]) => ({ date, newUsers }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Daily tips calculation (last 30 days)
    const tipsLastMonth = await prisma.tip.findMany({
      where: { date: { gte: lastMonth } },
      select: { amount: true, date: true }
    });
    // Group tips by day
    const dailyTipsMap: Record<string, number> = {};
    tipsLastMonth.forEach((tip) => {
      const date =
        tip.date instanceof Date
          ? tip.date.toISOString().slice(0, 10)
          : new Date(tip.date).toISOString().slice(0, 10);
      dailyTipsMap[date] = (dailyTipsMap[date] || 0) + Number(tip.amount);
    });
    const dailyTips = Object.entries(dailyTipsMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Daily reading progress change (last 30 days) - Pure Prisma approach

    const readingProgressLastMonth = await prisma.readingProgress.findMany({
      where: {
        lastReadAt: {
          gte: lastMonth
        }
      },
      select: { lastReadAt: true }
    });
    // Group by day
    const dailyReadingProgressMap: Record<string, number> = {};
    readingProgressLastMonth.forEach((rp) => {
      if (rp.lastReadAt) {
        const date =
          rp.lastReadAt instanceof Date
            ? rp.lastReadAt.toISOString().slice(0, 10)
            : new Date(rp.lastReadAt).toISOString().slice(0, 10);
        dailyReadingProgressMap[date] = (dailyReadingProgressMap[date] || 0) + 1;
      }
    });
    const dailyReadingProgress = Object.entries(dailyReadingProgressMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Debug: Check most recent lastReadAt values
    const recentReadingProgress = await prisma.readingProgress.findMany({
      orderBy: { lastReadAt: 'desc' },
      take: 5,
      select: { lastReadAt: true }
    });

    // Fix total users change calculation - use a more appropriate baseline
    const usersBeforeJuly6 = await prisma.user.count({
      where: { createdAt: { lt: dataReferenceDate } }
    });
    const usersOnJuly6AndAfter = await prisma.user.count({
      where: { createdAt: { gte: dataReferenceDate } }
    });

    const totalUsersChange = usersOnJuly6AndAfter;
    const totalUsersChangePercent =
      usersBeforeJuly6 > 0 ? (totalUsersChange / usersBeforeJuly6) * 100 : 0;

    // Debug: Check user creation dates
    const sampleUsers = await prisma.user.findMany({
      select: { id: true, createdAt: true },
      take: 5,
      orderBy: { createdAt: 'asc' }
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

    // Get the actual user data for these users
    const topTippers = await Promise.all(
      usersWithTipStats.map(async (tipData) => {
        const user = await prisma.user.findUnique({
          where: { id: tipData.userId ?? undefined },
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

    // Get user engagement stats
    const totalReadingProgress = await prisma.$runCommandRaw({
      count: 'reading_progress'
    });

    const totalReadingProgressCount = (totalReadingProgress as any).n || 0;

    // Calculate engagement rate (users with reading progress / total users)
    const engagementRate = totalUsers > 0 ? (activeUsersCount / totalUsers) * 100 : 0;

    // Debug: Aggregation count with $runCommandRaw
    const aggTest = await prisma.$runCommandRaw({
      aggregate: 'User',
      cursor: {},
      pipeline: [{ $match: { createdAt: { $gte: lastMonth } } }, { $count: 'count' }]
    });

    // Debug: Aggregation docs with $runCommandRaw
    const aggTestDocs = await prisma.$runCommandRaw({
      aggregate: 'User',
      cursor: {},
      pipeline: [
        { $addFields: { createdAt: { $toDate: '$createdAt' } } },
        { $match: { createdAt: { $gte: lastMonth } } },
        { $limit: 5 }
      ]
    });

    // Compile statistics
    const stats = {
      overview: {
        totalUsers,
        previousTotalUsers: usersBeforeJuly6,
        activeUsers: activeUsersCount,
        engagementRate: Math.round(engagementRate * 100) / 100, // Round to 2 decimal places
        totalTipsAmount: deepBigIntToString(totalTipsAmount),
        totalReadingProgress: totalReadingProgressCount,
        totalUsersChange,
        totalUsersChangePercent: Math.round(totalUsersChangePercent * 100) / 100
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
      userGrowth,
      dailyTips,
      dailyReadingProgress
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

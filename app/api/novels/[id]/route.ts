import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const novel = await prisma.novel.findUnique({
      where: { id: params.id },
      include: {
        tips: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          take: 10 // Get latest 10 tips
        },
        supporters: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          },
          orderBy: {
            totalTipped: 'desc'
          },
          take: 10 // Get top 10 supporters
        }
      }
    });

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Transform tips to include username
    const transformedTips = novel.tips.map((tip: any) => ({
      username: tip.user?.username || 'Anonymous',
      amount: tip.amount,
      date: tip.date.toISOString()
    }));

    // Calculate total tips amount
    const totalTipsAmount = novel.tips.reduce((sum: number, tip: any) => sum + tip.amount, 0);

    // Return novel with enhanced data
    const novelWithTips = {
      ...novel,
      tips: transformedTips,
      totalTips: totalTipsAmount,
      tipCount: novel.tips.length,
      supporters: novel.supporters.map((supporter: any) => ({
        username: supporter.user?.username || 'Anonymous',
        totalTipped: supporter.totalTipped
      }))
    };

    return NextResponse.json(novelWithTips);
  } catch (error) {
    console.error('Error fetching novel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

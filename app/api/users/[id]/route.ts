import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const body = await req.json();

    // Build update data
    const updateData: any = {};

    if (typeof body.hasAddedMiniapp === 'boolean') {
      updateData.hasAddedMiniapp = body.hasAddedMiniapp;
    }

    if (typeof body.spendLimit === 'number') {
      updateData.spendLimit = body.spendLimit;
    }

    if (typeof body.chapterTipAmount === 'number') {
      updateData.chapterTipAmount = body.chapterTipAmount;
    }

    if (typeof body.notificationUrl === 'string') {
      updateData.notificationUrl = body.notificationUrl;
    }
    if (typeof body.notificationToken === 'string') {
      updateData.notificationToken = body.notificationToken;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

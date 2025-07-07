import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await req.json();
    
    console.log('[PATCH /api/users/[id]] Updating user:', userId, 'with data:', body);

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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    console.log('[PATCH /api/users/[id]] User updated successfully:', updatedUser);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[PATCH /api/users/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
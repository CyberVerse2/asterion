import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json();
    // Deduplication: check for existing pre-save by userId or email
    let existing = null;
    if (userId) {
      existing = await prisma.preSave.findFirst({ where: { userId } });
    } else if (email) {
      existing = await prisma.preSave.findFirst({ where: { email } });
    }
    let entry = existing;
    if (!existing) {
      // Save pre-save entry
      entry = await prisma.preSave.create({
        data: {
          email: email || undefined,
          userId: userId || undefined
        }
      });
    }
    // Analytics: log pre-save event
    console.log('[PreSave] Pre-save event:', {
      userId,
      email,
      id: entry.id,
      createdAt: entry.createdAt
    });
    // TODO: Notification integration (Warpcast/email)
    // e.g., await sendWarpcastDM(userId) or sendEmail(email)
    return NextResponse.json({ success: true, entry, deduped: !!existing });
  } catch (error) {
    console.error('[POST /api/presave] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

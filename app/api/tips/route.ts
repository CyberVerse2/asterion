import { NextResponse } from 'next/server';
import { calculateTipDistribution } from '@/lib/tip-calculator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, amount, novelId, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Use the spend permission system via /api/collect
    const collectResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/collect`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          novelId,
          amount: amount
          // Note: spendPermission and signature will need to be retrieved from user record
          // This is a simplified version - in practice, you'd get these from the user's stored permission
        })
      }
    );

    if (!collectResponse.ok) {
      throw new Error('Failed to process tip via spend permission');
    }

    const collectData = await collectResponse.json();

    // Calculate tip distribution for display
    const distribution = calculateTipDistribution(amount);

    return NextResponse.json({
      tip: {
        id: Date.now().toString(),
        username,
        amount,
        novelId,
        userId,
        date: new Date()
      },
      distribution,
      transactionHash: collectData.transactionHash,
      transactionUrl: collectData.transactionUrl,
      message: 'Tip processed successfully'
    });
  } catch (error) {
    console.error('Error processing tip:', error);
    return NextResponse.json({ error: 'Failed to process tip' }, { status: 500 });
  }
}

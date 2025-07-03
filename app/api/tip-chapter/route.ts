import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
  USDC_ADDRESS
} from '@/lib/abi/SpendPermissionManager';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[tip-chapter] Incoming request body:', body);
    const { userId, chapterId } = body;
    if (!userId || !chapterId) {
      console.error('[tip-chapter] Missing userId or chapterId', { userId, chapterId });
      return NextResponse.json({ error: 'Missing userId or chapterId' }, { status: 400 });
    }

    // Look up user in DB (assume spendPermission and signature are stored on user)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log('[tip-chapter] User lookup result:', user);
    if (!user || !user.spendPermission || !user.spendPermissionSignature) {
      console.error('[tip-chapter] User has not granted spend permission', { user });
      return NextResponse.json({ error: 'User has not granted spend permission' }, { status: 400 });
    }
    const spendPermission = user.spendPermission;
    const signature = user.spendPermissionSignature;
    console.log('[tip-chapter] SpendPermission:', spendPermission);
    console.log('[tip-chapter] Signature:', signature);

    // Spend 0.1 USDC (6 decimals)
    const amount = BigInt(0.1 * 10 ** 6);
    console.log('[tip-chapter] Spending amount:', amount.toString());
    const spenderBundlerClient = await getSpenderWalletClient();
    const publicClient = await getPublicClient();
    console.log('[tip-chapter] Got spenderBundlerClient and publicClient');
    const spendTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [spendPermission, amount]
    });
    console.log('[tip-chapter] spendTxnHash:', spendTxnHash);
    const spendReceipt = await publicClient.waitForTransactionReceipt({ hash: spendTxnHash });
    console.log('[tip-chapter] spendReceipt:', spendReceipt);

    // Update tip count in DB
    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { tipCount: { increment: 1 } }
    });
    console.log('[tip-chapter] updatedChapter:', updatedChapter);

    return NextResponse.json({
      status: spendReceipt.status ? 'success' : 'failure',
      transactionHash: spendReceipt.transactionHash,
      transactionUrl: `https://sepolia.basescan.org/tx/${spendReceipt.transactionHash}`,
      tipCount: updatedChapter.tipCount
    });
  } catch (error) {
    console.error('[tip-chapter] Caught error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || error },
      { status: 500 }
    );
  }
}

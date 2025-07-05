import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
  USDC_ADDRESS
} from '@/lib/abi/SpendPermissionManager';
import { prisma } from '@/lib/prisma';
import { validateSpendPermission } from '@/lib/utils/spend-permission';

// ERC20 ABI for transfer function
const erc20Abi = [
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      { name: 'from', type: 'address', internalType: 'address' },
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  }
] as const;

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tips: true }
    });
    console.log('[tip-chapter] User lookup result:', user);
    if (!user || !user.spendPermission || !user.spendPermissionSignature) {
      console.error('[tip-chapter] User has not granted spend permission', { user });
      return NextResponse.json({ error: 'User has not granted spend permission' }, { status: 400 });
    }

    // Validate spend permission using the utility function
    const permissionStatus = validateSpendPermission(user as any);
    console.log('[tip-chapter] Permission validation result:', permissionStatus);

    if (!permissionStatus.isValid) {
      console.error('[tip-chapter] Invalid spend permission:', permissionStatus.errorMessage);
      return NextResponse.json(
        {
          error: 'Invalid spend permission',
          details: permissionStatus.errorMessage
        },
        { status: 400 }
      );
    }

    // Get the chapter to find the novel
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { novelRel: true }
    });

    if (!chapter || !chapter.novelRel) {
      console.error('[tip-chapter] Chapter or novel not found', { chapterId });
      return NextResponse.json({ error: 'Chapter or novel not found' }, { status: 400 });
    }

    // Check if user has already tipped this chapter
    const existingTip = await prisma.tip.findFirst({
      where: {
        userId,
        chapterId
      }
    });

    if (existingTip) {
      console.log('[tip-chapter] User has already tipped this chapter', { userId, chapterId });
      return NextResponse.json({ error: 'You have already tipped this chapter' }, { status: 400 });
    }

    // Use user's custom chapter tip amount, fallback to 0.01 USDC
    const tipAmountUSD = user.chapterTipAmount || 0.01;
    const amount = BigInt(Math.round(tipAmountUSD * 10 ** 6)); // Convert to USDC wei (6 decimals)
    console.log(
      '[tip-chapter] Spending amount (USDC, 6 decimals):',
      amount.toString(),
      'for',
      tipAmountUSD,
      'USDC'
    );

    const spenderBundlerClient = await getSpenderWalletClient();
    const publicClient = await getPublicClient();
    console.log('[tip-chapter] Got spenderBundlerClient and publicClient');

    let spendTxnHash: string;

    // Handle different permission types
    if (permissionStatus.permissionType === 'erc20') {
      // For ERC20 approval users (Farcaster users), use transferFrom
      console.log('[tip-chapter] Using ERC20 transferFrom for Farcaster user');

      if (!user.walletAddress) {
        console.error('[tip-chapter] ERC20 user missing wallet address');
        return NextResponse.json({ error: 'Wallet address not found' }, { status: 400 });
      }

      spendTxnHash = await spenderBundlerClient.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transferFrom',
        args: [user.walletAddress as `0x${string}`, spenderBundlerClient.account.address, amount]
      });
      console.log('[tip-chapter] ERC20 transferFrom txnHash:', spendTxnHash);
    } else {
      // For Coinbase spend permission users, use the SpendPermissionManager
      console.log('[tip-chapter] Using SpendPermissionManager for wallet-only user');

      const spendPermission = user.spendPermission;
      spendTxnHash = (await spenderBundlerClient.writeContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'spend',
        args: [spendPermission, amount]
      })) as `0x${string}`;
      console.log('[tip-chapter] SpendPermissionManager spend txnHash:', spendTxnHash);
    }

    const spendReceipt = await publicClient.waitForTransactionReceipt({ hash: spendTxnHash });
    console.log('[tip-chapter] spendReceipt:', spendReceipt);

    // If transaction was successful, update database
    if (spendReceipt.status) {
      // Get current tip count and increment manually (Prisma increment doesn't work reliably with MongoDB)
      const currentChapter = await prisma.chapter.findUnique({
        where: { id: chapterId }
      });
      const newTipCount = (currentChapter?.tipCount || 0) + 1;

      // Update tip count in chapter
      const updatedChapter = await prisma.chapter.update({
        where: { id: chapterId },
        data: { tipCount: newTipCount }
      });
      console.log('[tip-chapter] updatedChapter:', updatedChapter);

      // Create tip record for user
      await prisma.tip.create({
        data: {
          userId,
          novelId: chapter.novelRel.id,
          chapterId: chapterId,
          amount: tipAmountUSD
        }
      });
      console.log('[tip-chapter] Created tip record');

      // Update or create supporter record
      const existingSupporter = await prisma.supporter.findFirst({
        where: {
          userId,
          novelId: chapter.novelRel.id
        }
      });

      if (existingSupporter) {
        // Manual increment for supporter totalTipped as well
        const newTotalTipped = (existingSupporter.totalTipped || 0) + tipAmountUSD;

        await prisma.supporter.update({
          where: { id: existingSupporter.id },
          data: {
            totalTipped: newTotalTipped
          }
        });
        console.log('[tip-chapter] Updated existing supporter');
      } else {
        await prisma.supporter.create({
          data: {
            userId,
            novelId: chapter.novelRel.id,
            totalTipped: tipAmountUSD
          }
        });
        console.log('[tip-chapter] Created new supporter record');
      }

      return NextResponse.json({
        status: 'success',
        transactionHash: spendReceipt.transactionHash,
        transactionUrl: `https://basescan.org/tx/${spendReceipt.transactionHash}`,
        tipCount: updatedChapter.tipCount,
        tipAmount: tipAmountUSD
      });
    } else {
      return NextResponse.json(
        {
          status: 'failure',
          error: 'Transaction failed'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[tip-chapter] Caught error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error)?.message || String(error) },
      { status: 500 }
    );
  }
}

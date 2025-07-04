import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
  USDC_ADDRESS
} from '@/lib/abi/SpendPermissionManager';
import { prisma } from '@/lib/prisma';

// Minimal ERC-20 ABI for transferFrom
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  }
];

export async function POST(request: NextRequest) {
  const spenderBundlerClient = await getSpenderWalletClient();
  const publicClient = await getPublicClient();
  try {
    const body = await request.json();
    const { spendPermission, signature, userId, novelId, amount } = body;

    // Calculate USDC amount (6 decimals) - 0.01 USDC = 10000 wei
    const tipAmountUSD = amount || 0.01; // Default to 0.01 USD
    const usdcAmount = BigInt(Math.floor(tipAmountUSD * 10 ** 6)); // Convert to USDC wei

    // Fetch user to determine flow
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let transactionHash = '';
    let transactionUrl = '';
    let status = 'failure';

    if (spendPermission && signature) {
      // --- EIP-712 FLOW (wallet-only users) ---
      // Convert string values back to BigInt for contract call
      const contractSpendPermission = {
        account: spendPermission.account,
        spender: spendPermission.spender,
        token: spendPermission.token,
        allowance: BigInt(spendPermission.allowance),
        period: BigInt(spendPermission.period),
        start: BigInt(spendPermission.start),
        end: BigInt(spendPermission.end),
        salt: BigInt(spendPermission.salt),
        extraData: spendPermission.extraData
      };
      // Approve the spend permission
      const approvalTxnHash = await spenderBundlerClient.writeContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'approveWithSignature',
        args: [contractSpendPermission, signature]
      });
      await publicClient.waitForTransactionReceipt({ hash: approvalTxnHash });
      // Use the spend permission to spend user's funds
      const spendTxnHash = await spenderBundlerClient.writeContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'spend',
        args: [contractSpendPermission, usdcAmount]
      });
      const spendReceipt = await publicClient.waitForTransactionReceipt({ hash: spendTxnHash });
      transactionHash = spendReceipt.transactionHash;
      transactionUrl = `https://basescan.org/tx/${spendReceipt.transactionHash}`;
      status = spendReceipt.status ? 'success' : 'failure';
    } else if (user.walletAddress) {
      // --- ERC-20 APPROVE FLOW (Farcaster users) ---
      // Move USDC from user to recipient (the address in NEXT_PUBLIC_SPENDER_ADDRESS)
      const from = user.walletAddress;
      const to = process.env.NEXT_PUBLIC_SPENDER_ADDRESS || spendPermissionManagerAddress;
      const transferTxnHash = await spenderBundlerClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transferFrom',
        args: [from, to, usdcAmount]
      });
      const transferReceipt = await publicClient.waitForTransactionReceipt({
        hash: transferTxnHash
      });
      transactionHash = transferReceipt.transactionHash;
      transactionUrl = `https://basescan.org/tx/${transferReceipt.transactionHash}`;
      status = transferReceipt.status ? 'success' : 'failure';
    } else {
      return NextResponse.json(
        { error: 'User does not have spend permission or wallet address' },
        { status: 400 }
      );
    }

    // If transaction was successful, record the tip in database
    if (status === 'success' && userId && novelId) {
      try {
        // Create tip record
        await prisma.tip.create({
          data: {
            userId,
            novelId,
            amount: tipAmountUSD
          }
        });
        // Update or create supporter record
        const existingSupporter = await prisma.supporter.findFirst({
          where: { userId, novelId }
        });
        if (existingSupporter) {
          const newTotalTipped = (existingSupporter.totalTipped || 0) + tipAmountUSD;
          await prisma.supporter.update({
            where: { id: existingSupporter.id },
            data: { totalTipped: newTotalTipped }
          });
        } else {
          await prisma.supporter.create({
            data: { userId, novelId, totalTipped: tipAmountUSD }
          });
        }
      } catch (dbError) {
        console.error('Database error while recording tip:', dbError);
        // Don't fail the response since the blockchain transaction succeeded
      }
    }

    return NextResponse.json({
      status,
      transactionHash,
      transactionUrl,
      tipAmount: tipAmountUSD
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({}, { status: 500 });
  }
}

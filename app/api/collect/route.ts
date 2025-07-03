import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress
} from '@/lib/abi/SpendPermissionManager';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const spenderBundlerClient = await getSpenderWalletClient();
  const publicClient = await getPublicClient();
  try {
    const body = await request.json();
    const { spendPermission, signature, userId, novelId, amount } = body;

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

    // Calculate USDC amount (6 decimals) - 0.01 USDC = 10000 wei
    const tipAmountUSD = amount || 0.01; // Default to 0.01 USD
    const usdcAmount = BigInt(Math.floor(tipAmountUSD * 10 ** 6)); // Convert to USDC wei

    // Approve the spend permission
    const approvalTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [contractSpendPermission, signature]
    });

    const approvalReceipt = await publicClient.waitForTransactionReceipt({
      hash: approvalTxnHash
    });

    // Use the spend permission to spend user's funds
    const spendTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [contractSpendPermission, usdcAmount]
    });

    const spendReceipt = await publicClient.waitForTransactionReceipt({
      hash: spendTxnHash
    });

    // If transaction was successful, record the tip in database
    if (spendReceipt.status && userId && novelId) {
      try {
        // Get user info for tip record
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (user) {
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
            where: {
              userId,
              novelId
            }
          });

          if (existingSupporter) {
            await prisma.supporter.update({
              where: { id: existingSupporter.id },
              data: {
                totalTipped: {
                  increment: tipAmountUSD
                }
              }
            });
          } else {
            await prisma.supporter.create({
              data: {
                userId,
                novelId,
                totalTipped: tipAmountUSD
              }
            });
          }
        }
      } catch (dbError) {
        console.error('Database error while recording tip:', dbError);
        // Don't fail the response since the blockchain transaction succeeded
      }
    }

    return NextResponse.json({
      status: spendReceipt.status ? 'success' : 'failure',
      transactionHash: spendReceipt.transactionHash,
      transactionUrl: `https://basescan.org/tx/${spendReceipt.transactionHash}`,
      tipAmount: tipAmountUSD
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({}, { status: 500 });
  }
}

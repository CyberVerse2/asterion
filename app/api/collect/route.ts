import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress
} from '@/lib/abi/SpendPermissionManager';

// Utility to convert string numbers to BigInt while preserving BigInt values
function stringToBigInt(obj: any): any {
  if (typeof obj === 'string' && obj.match(/^\d+$/)) return BigInt(obj);
  if (typeof obj === 'bigint') return obj; // Keep existing BigInt
  if (typeof obj === 'number') return BigInt(obj);
  if (Array.isArray(obj)) return obj.map(stringToBigInt);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stringToBigInt(v)]));
  }
  return obj;
}

export async function POST(request: NextRequest) {
  const spenderBundlerClient = await getSpenderWalletClient();
  const publicClient = await getPublicClient();
  try {
    const body = await request.json();
    let { spendPermission, signature } = body;

    console.log('[collect] Raw received spendPermission:', spendPermission);
    console.log('[collect] Raw signature:', signature);

    // Convert only stringified numbers to BigInt, preserve original structure
    spendPermission = stringToBigInt(spendPermission);

    console.log('[collect] Final spendPermission for contract:', spendPermission);
    Object.entries(spendPermission).forEach(([k, v]) => {
      console.log(`[collect] field: ${k}, value: ${v}, type: ${typeof v}`);
    });

    // Use the spendPermission exactly as reconstructed for the contract call
    const approvalTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [spendPermission, signature]
    });

    const approvalReceipt = await publicClient.waitForTransactionReceipt({
      hash: approvalTxnHash
    });

    console.log('[collect] Approval successful, proceeding to spend...');

    // Spend (use the permission)
    const spendTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [spendPermission, BigInt(1)] // Spend 1 USDC wei (0.000001 USDC)
    });

    const spendReceipt = await publicClient.waitForTransactionReceipt({
      hash: spendTxnHash
    });

    return NextResponse.json({
      status: spendReceipt.status ? 'success' : 'failure',
      transactionHash: spendReceipt.transactionHash,
      transactionUrl: `https://basescan.org/tx/${spendReceipt.transactionHash}`
    });
  } catch (error) {
    console.error('[collect] Error:', error);
    return NextResponse.json(
      {
        error: 'Contract call failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

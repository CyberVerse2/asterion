import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress
} from '@/lib/abi/SpendPermissionManager';

// Utility to deeply convert stringified BigInts and numbers to native BigInt
function deepToBigInt(obj: any): any {
  if (typeof obj === 'string' && obj.match(/^\d+$/)) return BigInt(obj);
  if (typeof obj === 'number') return BigInt(obj);
  if (Array.isArray(obj)) return obj.map(deepToBigInt);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepToBigInt(v)]));
  }
  return obj;
}

export async function POST(request: NextRequest) {
  const spenderBundlerClient = await getSpenderWalletClient();
  const publicClient = await getPublicClient();
  try {
    const body = await request.json();
    let { spendPermission, signature } = body;

    // Convert stringified BigInts and numbers to native BigInt
    spendPermission = deepToBigInt(spendPermission);
    console.log('[collect] Reconstructed spendPermission:', spendPermission);
    Object.entries(spendPermission).forEach(([k, v]) => {
      console.log(`[collect] spendPermission field: ${k}, value: ${v}, type: ${typeof v}`);
    });
    console.log('[collect] Signature:', signature);

    // Ensure all numeric fields are explicitly BigInt for the contract call
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

    console.log('[collect] Contract spendPermission before call:');
    Object.entries(contractSpendPermission).forEach(([k, v]) => {
      console.log(`[collect] contract field: ${k}, value: ${v}, type: ${typeof v}`);
    });

    // Approve spend permission onchain
    const approvalTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [contractSpendPermission, signature]
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
      args: [contractSpendPermission, BigInt(1)] // Use BigInt for spend amount too
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

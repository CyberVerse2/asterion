import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress
} from '@/lib/abi/SpendPermissionManager';
import { BigNumber } from 'ethers';

// Utility to deeply convert stringified BigInts and numbers to ethers.BigNumber
function deepToBigNumber(obj: any): any {
  if (typeof obj === 'string' && obj.match(/^\d+$/)) return BigNumber.from(obj);
  if (typeof obj === 'number') return BigNumber.from(obj);
  if (Array.isArray(obj)) return obj.map(deepToBigNumber);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepToBigNumber(v)]));
  }
  return obj;
}

export async function POST(request: NextRequest) {
  const spenderBundlerClient = await getSpenderWalletClient();
  const publicClient = await getPublicClient();
  try {
    const body = await request.json();
    let { spendPermission, signature } = body;

    // Convert stringified BigInts and numbers to ethers.BigNumber
    spendPermission = deepToBigNumber(spendPermission);
    console.log('[collect] Reconstructed spendPermission:', spendPermission);
    Object.entries(spendPermission).forEach(([k, v]) => {
      console.log(`[collect] spendPermission field: ${k}, value: ${v}, type: ${typeof v}`);
    });
    console.log('[collect] Signature:', signature);

    // Approve spend permission onchain
    const approvalTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [spendPermission, signature]
    });

    const approvalReceipt = await publicClient.waitForTransactionReceipt({
      hash: approvalTxnHash
    });

    // Spend (use the permission)
    const spendTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [spendPermission, '1'] // You may want to adjust the spend amount
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
    console.error(error);
    return NextResponse.json({}, { status: 500 });
  }
}

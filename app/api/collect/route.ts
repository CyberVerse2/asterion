import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import { getAddress } from 'viem';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress
} from '@/lib/abi/SpendPermissionManager';

export async function POST(request: NextRequest) {
  const spenderBundlerClient = await getSpenderWalletClient();
  const publicClient = await getPublicClient();
  try {
    const body = await request.json();
    const { spendPermission, signature } = body;

    console.log(
      '[collect] Received spendPermission (with string values from JSON):',
      spendPermission
    );
    console.log('[collect] Received signature:', signature);
    console.log('[collect] Signature type:', typeof signature);
    console.log('[collect] Signature length:', signature.length);
    console.log('[collect] Signature starts with 0x:', signature.startsWith('0x'));

    Object.entries(spendPermission).forEach(([k, v]) => {
      console.log(`[collect] received field: ${k}, value: ${v}, type: ${typeof v}`);
    });

    // Convert the string values back to proper types for contract call
    // The signature was created with BigInt values, but JSON transport converts them to strings
    // Also normalize addresses to ensure checksum consistency
    const contractSpendPermission = {
      account: getAddress(spendPermission.account),
      spender: getAddress(spendPermission.spender),
      token: getAddress(spendPermission.token),
      allowance: BigInt(spendPermission.allowance),
      period: BigInt(spendPermission.period),
      start: BigInt(spendPermission.start),
      end: BigInt(spendPermission.end),
      salt: BigInt(spendPermission.salt),
      extraData: spendPermission.extraData
    };

    console.log('[collect] Contract spendPermission (converted for contract):');
    Object.entries(contractSpendPermission).forEach(([k, v]) => {
      console.log(`[collect] contract field: ${k}, value: ${v}, type: ${typeof v}`);
    });

    console.log('[collect] About to call approveWithSignature with converted spend permission');

    // Convert to tuple format that the contract expects
    const spendPermissionTuple = [
      contractSpendPermission.account,
      contractSpendPermission.spender,
      contractSpendPermission.token,
      contractSpendPermission.allowance,
      contractSpendPermission.period,
      contractSpendPermission.start,
      contractSpendPermission.end,
      contractSpendPermission.salt,
      contractSpendPermission.extraData
    ];

    console.log('[collect] SpendPermission tuple for contract:', spendPermissionTuple);
    console.log(
      '[collect] Types of tuple elements:',
      spendPermissionTuple.map((item, i) => `[${i}]: ${typeof item}`)
    );

    // Use the tuple structure for the contract call
    const approvalTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [spendPermissionTuple, signature]
    });

    const approvalReceipt = await publicClient.waitForTransactionReceipt({
      hash: approvalTxnHash
    });

    console.log('[collect] Approval successful, proceeding to spend...');

    // Spend (use the permission) - use tuple structure
    const spendTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [spendPermissionTuple, BigInt(1)] // Spend 1 USDC wei
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

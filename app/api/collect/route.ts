import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import { getAddress, verifyTypedData } from 'viem';
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

    // Convert the values back to proper types for contract call
    // The signature was created with mixed types: BigInt for allowance/salt, numbers for period/start/end
    const contractSpendPermission = {
      account: getAddress(spendPermission.account),
      spender: getAddress(spendPermission.spender),
      token: getAddress(spendPermission.token),
      allowance: BigInt(spendPermission.allowance),
      period: BigInt(spendPermission.period), // Convert number to BigInt for contract
      start: BigInt(spendPermission.start), // Convert number to BigInt for contract
      end: BigInt(spendPermission.end), // Convert number to BigInt for contract
      salt: BigInt(spendPermission.salt),
      extraData: spendPermission.extraData
    };

    console.log('[collect] Contract spendPermission (converted for contract):');
    Object.entries(contractSpendPermission).forEach(([k, v]) => {
      console.log(`[collect] contract field: ${k}, value: ${v}, type: ${typeof v}`);
    });

    console.log('[collect] About to call approveWithSignature with converted spend permission');

    // Verify the signature locally before sending to contract
    // Use the original mixed types for verification to match what was actually signed
    const messageForVerification = {
      account: getAddress(spendPermission.account),
      spender: getAddress(spendPermission.spender),
      token: getAddress(spendPermission.token),
      allowance: BigInt(spendPermission.allowance), // Convert back to BigInt
      period: Number(spendPermission.period), // Keep as number for verification
      start: Number(spendPermission.start), // Keep as number for verification
      end: Number(spendPermission.end), // Keep as number for verification
      salt: BigInt(spendPermission.salt), // Convert back to BigInt
      extraData: spendPermission.extraData
    };

    console.log('[collect] Message for verification (mixed types):', messageForVerification);

    const isValidSignature = await verifyTypedData({
      address: getAddress(spendPermission.account),
      domain: {
        name: 'Spend Permission Manager',
        version: '1',
        chainId: 8453, // Base mainnet
        verifyingContract: spendPermissionManagerAddress
      },
      types: {
        SpendPermission: [
          { name: 'account', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'allowance', type: 'uint160' },
          { name: 'period', type: 'uint48' },
          { name: 'start', type: 'uint48' },
          { name: 'end', type: 'uint48' },
          { name: 'salt', type: 'uint256' },
          { name: 'extraData', type: 'bytes' }
        ]
      },
      primaryType: 'SpendPermission',
      message: messageForVerification as any,
      signature: signature as `0x${string}`
    });

    console.log('[collect] Local signature verification result:', isValidSignature);

    if (!isValidSignature) {
      console.error('[collect] Signature verification failed locally!');
      return NextResponse.json(
        { error: 'Invalid signature - verification failed locally' },
        { status: 400 }
      );
    }

    // Use the contractSpendPermission directly - it already has correct types
    console.log('[collect] Contract spend permission for contract call:', contractSpendPermission);
    console.log(
      '[collect] Types of contract object:',
      Object.entries(contractSpendPermission).map(([k, v]) => `${k}: ${typeof v}`)
    );

    // Use the typed object structure for the contract call
    const approvalTxnHash = await spenderBundlerClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [contractSpendPermission as any, signature as `0x${string}`]
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
      args: [contractSpendPermission as any, BigInt(1)] // Spend 1 USDC wei
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

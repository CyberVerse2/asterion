import { createPublicClient, createWalletClient, Hex, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export async function getPublicClient() {
  const client = createPublicClient({
    chain: base,
    transport: http()
  });
  return client;
}

export async function getSpenderWalletClient() {
  const spenderAccount = privateKeyToAccount(process.env.SPENDER_PRIVATE_KEY! as Hex);

  const spenderWallet = await createWalletClient({
    account: spenderAccount,
    chain: base,
    transport: http()
  });
  return spenderWallet;
}

import { Connection, PublicKey, Transaction } from "@solana/web3.js";

type SendTransaction = (
  transaction: Transaction,
  connection: Connection,
  options?: { skipPreflight?: boolean }
) => Promise<string>;

export async function sendAndConfirm(
  connection: Connection,
  sendTransaction: SendTransaction,
  payer: PublicKey,
  transaction: Transaction
) {
  const latestBlockhash = await connection.getLatestBlockhash();
  transaction.feePayer = payer;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  const signature = await sendTransaction(transaction, connection, {
    skipPreflight: false
  });

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    },
    "confirmed"
  );

  return signature;
}
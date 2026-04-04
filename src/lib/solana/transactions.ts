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

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    },
    "confirmed"
  );

  if (confirmation.value.err) {
    const confirmedTransaction = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0
    });
    const logs = confirmedTransaction?.meta?.logMessages?.slice(-8).join(" | ");
    const error = JSON.stringify(confirmation.value.err);

    throw new Error(logs ? `Transaction echouee (${signature}): ${error}. Logs: ${logs}` : `Transaction echouee (${signature}): ${error}.`);
  }

  return signature;
}
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

type SendTransaction = (
  transaction: Transaction,
  connection: Connection,
  options?: { skipPreflight?: boolean }
) => Promise<string>;

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isCommitmentReached(confirmationStatus: string | undefined, commitment: "confirmed" | "finalized") {
  if (!confirmationStatus) {
    return false;
  }

  if (commitment === "confirmed") {
    return confirmationStatus === "confirmed" || confirmationStatus === "finalized";
  }

  return confirmationStatus === "finalized";
}

export async function pollForSignatureConfirmation(args: {
  connection: Connection;
  signature: string;
  lastValidBlockHeight: number;
  commitment?: "confirmed" | "finalized";
  pollIntervalMs?: number;
}) {
  const {
    connection,
    signature,
    lastValidBlockHeight,
    commitment = "confirmed",
    pollIntervalMs = 1_000
  } = args;

  for (;;) {
    const statuses = await connection.getSignatureStatuses([signature]);
    const status = statuses.value[0];

    if (status?.err) {
      return { err: status.err };
    }

    if (isCommitmentReached(status?.confirmationStatus, commitment)) {
      return { err: null };
    }

    const currentBlockHeight = await connection.getBlockHeight(commitment);
    if (currentBlockHeight > lastValidBlockHeight) {
      throw new Error(`Transaction expired before confirmation (${signature}).`);
    }

    await delay(pollIntervalMs);
  }
}

export async function buildTransactionErrorMessage(connection: Connection, signature: string, err: unknown) {
  const confirmedTransaction = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0
  });
  const logs = confirmedTransaction?.meta?.logMessages?.slice(-8).join(" | ");
  const error = JSON.stringify(err);

  return logs ? `Transaction failed (${signature}): ${error}. Logs: ${logs}` : `Transaction failed (${signature}): ${error}.`;
}

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

  const confirmation = await pollForSignatureConfirmation({
    connection,
    signature,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    commitment: "confirmed"
  });

  if (confirmation.err) {
    throw new Error(await buildTransactionErrorMessage(connection, signature, confirmation.err));
  }

  return signature;
}
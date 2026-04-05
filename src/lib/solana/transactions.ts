import { Connection, PublicKey, Transaction } from "@solana/web3.js";

const FAULTLINE_ERROR_HELP: Record<number, { title: string; nextStep: string }> = {
  6000: { title: "Instruction invalide.", nextStep: "Rafraichis la page puis retente l'action." },
  6001: { title: "Signature manquante.", nextStep: "Valide la transaction dans ton wallet." },
  6002: { title: "Compte protocole invalide.", nextStep: "Rafraichis la room avant de retenter." },
  6004: { title: "Etat de room invalide.", nextStep: "La room a probablement change. Recharge les donnees." },
  6005: { title: "La room est deja initialisee.", nextStep: "Entre simplement dans la room existante." },
  6006: { title: "Cette action n'est pas autorisee dans la phase actuelle.", nextStep: "Observe la phase live puis retente au bon moment." },
  6007: { title: "La fenetre de join est fermee.", nextStep: "Choisis une autre lane ou attends le reset." },
  6008: { title: "Ce wallet est deja assis dans cette room.", nextStep: "Ouvre la room pour continuer avec ce siege." },
  6009: { title: "Joueur introuvable dans la room.", nextStep: "Reconnecte le bon wallet puis recharge la room." },
  6010: { title: "Etat joueur incompatible avec cette action.", nextStep: "Attends la phase suivante ou recharge la room." },
  6011: { title: "Forecast invalide.", nextStep: "Le total du forecast doit respecter les bornes de joueurs." },
  6012: { title: "Zone invalide.", nextStep: "Choisis une zone valide avant de signer." },
  6013: { title: "Risk band invalide.", nextStep: "Choisis Calm, Edge ou Knife." },
  6014: { title: "Le reveal ne correspond pas au commit scelle.", nextStep: "Importe un backup valide ou recharge le payload local." },
  6015: { title: "La phase commit n'est pas prete.", nextStep: "Attends la progression normale de la room." },
  6016: { title: "La phase reveal n'est pas prete.", nextStep: "Attends que les commits soient tous verrouilles ou expires." },
  6017: { title: "La room n'est pas encore resolvable.", nextStep: "Attends plus de reveals ou la fin de fenetre." },
  6018: { title: "Aucune recompense a claim.", nextStep: "Verifie d'abord ton finish et le payout visible." },
  6019: { title: "La recompense a deja ete claim.", nextStep: "Rafraichis la room pour confirmer l'etat du vault." },
  6020: { title: "Il n'y a pas assez de joueurs actifs.", nextStep: "La room doit etre annulee ou reset." },
  6021: { title: "Overflow arithmetique du programme.", nextStep: "N'insiste pas et remonte ce cas." },
  6022: { title: "Le chemin d'urgence public est desactive.", nextStep: "Utilise uniquement les actions normales de la room." },
  6023: { title: "Programme systeme invalide.", nextStep: "Rafraichis la page et reconstruis la transaction." }
};

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
  const logsArray = confirmedTransaction?.meta?.logMessages?.slice(-8) ?? [];
  const logs = logsArray.join(" | ");
  const error = JSON.stringify(err);

  const faultlineCode = extractFaultlineErrorCode(err, logsArray);
  if (faultlineCode !== null) {
    const mapped = FAULTLINE_ERROR_HELP[faultlineCode];
    if (mapped) {
      return `${mapped.title} ${mapped.nextStep} Signature: ${signature}.${logs ? ` Logs: ${logs}` : ""}`;
    }
  }

  const genericMessage = extractGenericWalletError(err);
  if (genericMessage) {
    return `${genericMessage} Signature: ${signature}.${logs ? ` Logs: ${logs}` : ""}`;
  }

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

function extractFaultlineErrorCode(err: unknown, logs: string[]) {
  if (err && typeof err === "object" && "InstructionError" in err) {
    const instructionError = (err as { InstructionError?: unknown }).InstructionError;
    if (Array.isArray(instructionError) && instructionError[1] && typeof instructionError[1] === "object" && "Custom" in instructionError[1]) {
      const code = Number((instructionError[1] as { Custom: number }).Custom);
      return Number.isFinite(code) ? code : null;
    }
  }

  for (const line of logs) {
    const matched = line.match(/custom program error: 0x([0-9a-f]+)/i);
    if (matched) {
      return Number.parseInt(matched[1], 16);
    }
  }

  return null;
}

function extractGenericWalletError(err: unknown) {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("rejected the request") || lower.includes("denied")) {
    return "La transaction a ete refusee dans le wallet.";
  }

  if (lower.includes("expired before confirmation") || lower.includes("block height exceeded")) {
    return "La transaction a expire avant confirmation. Reessaie avec une room rafraichie.";
  }

  if (lower.includes("insufficient funds")) {
    return "Le wallet n'a pas assez de SOL pour couvrir le stake et les frais.";
  }

  return null;
}
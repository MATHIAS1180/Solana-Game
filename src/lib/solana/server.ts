import "server-only";

import bs58 from "bs58";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";

import { getFaultlineProgramId, getServerRpcEndpoint } from "@/lib/solana/cluster";
import { buildTransactionErrorMessage, pollForSignatureConfirmation } from "@/lib/solana/transactions";

let sharedConnection: Connection | null = null;
let sharedRelayer: Keypair | null = null;

function parseRelayerSecretKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("FAULTLINE_RELAYER_SECRET_KEY est vide.");
  }

  const secretBytes = trimmed.startsWith("[") ? Uint8Array.from(JSON.parse(trimmed) as number[]) : bs58.decode(trimmed);
  if (secretBytes.length === 64) {
    return secretBytes;
  }

  if (secretBytes.length === 32) {
    return Keypair.fromSeed(secretBytes).secretKey;
  }

  throw new Error("FAULTLINE_RELAYER_SECRET_KEY doit contenir 32 ou 64 bytes (JSON array ou base58).");
}

export function getRelayerPublicKeyFromSecret(value: string) {
  return Keypair.fromSecretKey(parseRelayerSecretKey(value)).publicKey;
}

export function getServerConnection() {
  if (!sharedConnection) {
    sharedConnection = new Connection(getServerRpcEndpoint(), "confirmed");
  }

  return sharedConnection;
}

export function getServerProgramId() {
  const programId = getFaultlineProgramId();
  if (!programId) {
    throw new Error("Faultline Program ID invalide.");
  }

  return programId;
}

export function getRelayerKeypair() {
  if (!sharedRelayer) {
    const rawSecret = process.env.FAULTLINE_RELAYER_SECRET_KEY;
    if (!rawSecret) {
      throw new Error("FAULTLINE_RELAYER_SECRET_KEY est requis pour l'automatisation.");
    }
    sharedRelayer = Keypair.fromSecretKey(parseRelayerSecretKey(rawSecret));
  }

  return sharedRelayer;
}

export async function sendRelayerTransaction(transaction: Transaction) {
  const connection = getServerConnection();
  const relayer = getRelayerKeypair();
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  transaction.feePayer = relayer.publicKey;
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.sign(relayer);

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed"
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

export function getRelayerPublicKey(): PublicKey {
  return getRelayerKeypair().publicKey;
}

export function hasRelayerConfiguration() {
  return Boolean(process.env.FAULTLINE_RELAYER_SECRET_KEY?.trim());
}
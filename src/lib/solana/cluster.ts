import { PublicKey, clusterApiUrl } from "@solana/web3.js";

const DEFAULT_FAULTLINE_PROGRAM_ID = "ESRu4YMdPS7WHRLAcwRmm1rHBFyEoMm7Qrcn6KMhCNWr";

export function getSolanaNetwork() {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
}

export function getRpcEndpoint() {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
}

export function getServerRpcEndpoint() {
  return process.env.FAULTLINE_SERVER_RPC_URL || getRpcEndpoint();
}

export function getFaultlineProgramId() {
  const value = process.env.NEXT_PUBLIC_FAULTLINE_PROGRAM_ID?.trim() || DEFAULT_FAULTLINE_PROGRAM_ID;
  if (!value) {
    return null;
  }

  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

export function getEmergencyFeatureFlag() {
  return process.env.NEXT_PUBLIC_ENABLE_EMERGENCY_ACTIONS === "true";
}
import { PublicKey } from "@solana/web3.js";
import clsx, { type ClassValue } from "clsx";

export function cn(...values: ClassValue[]) {
  return clsx(values);
}

export function shortKey(value: PublicKey | string, size = 4) {
  const text = typeof value === "string" ? value : value.toBase58();
  return `${text.slice(0, size)}...${text.slice(-size)}`;
}

export function formatLamports(lamports: bigint | number) {
  const amount = typeof lamports === "bigint" ? Number(lamports) : lamports;
  return `${(amount / 1_000_000_000).toFixed(amount >= 1_000_000_000 ? 3 : 4)} SOL`;
}

export function formatCountdown(slotsRemaining: number) {
  if (slotsRemaining <= 0) {
    return "expire";
  }

  const seconds = Math.floor(slotsRemaining * 0.4);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${restSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function explorerLink(signatureOrAddress: string, kind: "address" | "tx") {
  const baseUrl = process.env.NEXT_PUBLIC_SOLANA_EXPLORER_BASE_URL || "https://explorer.solana.com";
  const cluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
  const path = kind === "tx" ? "tx" : "address";
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;

  return `${baseUrl}/${path}/${signatureOrAddress}${suffix}`;
}
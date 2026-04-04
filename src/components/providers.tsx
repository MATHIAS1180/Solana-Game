"use client";

import { SolanaProvider } from "@/lib/solana/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SolanaProvider>{children}</SolanaProvider>;
}
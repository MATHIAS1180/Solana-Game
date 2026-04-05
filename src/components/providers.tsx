"use client";

import { AutomationHeartbeat } from "@/components/game/automation-heartbeat";
import { SolanaProvider } from "@/lib/solana/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider>
      <AutomationHeartbeat />
      {children}
    </SolanaProvider>
  );
}
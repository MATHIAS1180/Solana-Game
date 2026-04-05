"use client";

import { AutomationHeartbeat } from "@/components/game/automation-heartbeat";
import { NotificationCenter } from "@/components/game/notification-center";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SolanaProvider } from "@/lib/solana/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider>
      <ToastProvider>
        <AutomationHeartbeat />
        <NotificationCenter />
        {children}
      </ToastProvider>
    </SolanaProvider>
  );
}
"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AlertTriangle, RadioTower } from "lucide-react";

import { getFaultlineProgramId, getRpcEndpoint, getSolanaNetwork } from "@/lib/solana/cluster";
import { shortKey } from "@/lib/utils";

export function ProgramBanner() {
  const network = getSolanaNetwork();
  const rpcEndpoint = getRpcEndpoint();
  const programId = getFaultlineProgramId();

  return (
    <div className="fault-card rounded-[1.75rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-fault-flare">
            <RadioTower className="size-4" />
            Solana {network}
          </div>
          <div className="space-y-2 text-sm text-white/68">
            <p>
              RPC: <span className="font-mono text-white/86">{rpcEndpoint}</span>
            </p>
            <p>
              Program ID:{" "}
              {programId ? (
                <span className="font-mono text-white/86">{shortKey(programId, 6)}</span>
              ) : (
                <span className="inline-flex items-center gap-2 text-fault-flare">
                  <AlertTriangle className="size-4" />
                  Manquant dans .env.local
                </span>
              )}
            </p>
          </div>
        </div>

        <WalletMultiButton className="!h-auto !rounded-full !bg-fault-ember !px-5 !py-3 !font-display !text-sm !font-semibold !uppercase !tracking-[0.2em] !text-fault-basalt" />
      </div>
    </div>
  );
}
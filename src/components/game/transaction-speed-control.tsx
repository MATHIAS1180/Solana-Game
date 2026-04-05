"use client";

import { TRANSACTION_SPEED_LABELS, type TransactionSpeed } from "@/lib/solana/transactions";
import { cn } from "@/lib/utils";

export function TransactionSpeedControl({
  value,
  onChange,
  compact = false
}: {
  value: TransactionSpeed;
  onChange: (value: TransactionSpeed) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/25 p-4", compact && "p-3")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Tx speed</p>
          <p className="mt-2 text-sm leading-6 text-white/68">Add compute budget and optional retry logic for congestion-sensitive actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["none", "balanced", "aggressive"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition",
                value === option ? "border-fault-flare bg-fault-flare/10 text-white" : "border-white/10 bg-black/20 text-white/64 hover:border-white/25 hover:text-white"
              )}
            >
              {TRANSACTION_SPEED_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
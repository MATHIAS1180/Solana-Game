"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { cn } from "@/lib/utils";

export function WalletButton({ className }: { className?: string }) {
  return (
    <WalletMultiButton
      className={cn(
        "!h-auto !rounded-full !bg-transparent !px-5 !py-3 !font-display !text-sm !font-semibold !uppercase !tracking-[0.2em] !text-fault-basalt",
        className
      )}
    />
  );
}

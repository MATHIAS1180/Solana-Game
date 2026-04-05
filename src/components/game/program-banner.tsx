"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import { AlertTriangle, Orbit, RadioTower } from "lucide-react";

import { LiveDot } from "@/components/ui/live-dot";
import { WalletButton } from "@/components/ui/wallet-button";
import { getFaultlineProgramId, getRpcEndpoint, getSolanaNetwork } from "@/lib/solana/cluster";
import { cn, shortKey } from "@/lib/utils";

const navigationLinks = [
  { href: "/arena" as const, label: "Arena" },
  { href: "/how-it-works" as const, label: "How It Works" },
  { href: "/leaderboard" as const, label: "Leaderboard" },
  { href: "/watch" as const, label: "Watch" }
];

export function ProgramBanner() {
  const pathname = usePathname();
  const network = getSolanaNetwork();
  const rpcEndpoint = getRpcEndpoint();
  const programId = getFaultlineProgramId();

  return (
    <div className="sticky top-3 z-50">
      <div className="fault-card arena-banner-shell rounded-[1.9rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-3">
              <LiveDot />
              <span className="font-display text-xl uppercase tracking-[0.14em] text-white sm:text-2xl sm:tracking-[0.18em]">Faultline Arena</span>
            </Link>
            <span className="arena-kicker border-fault-signal/20 text-fault-signal">
              <Orbit className="size-4" />
              Solana {network}
            </span>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
            A live crowd-reading strategy game on Solana. Enter a persistent stake lobby, lock one private commit,
            reveal your exact read later, and compete in fully deterministic on-chain standings.
          </p>

          <div className="arena-nav-strip fault-scrollbar text-xs uppercase tracking-[0.22em] text-white/52">
            <Link
              href="/"
              className={cn(
                "rounded-full border px-4 py-2 transition",
                pathname === "/" ? "border-white/18 bg-white/10 text-white" : "border-white/8 bg-white/[0.03] text-white/64 hover:border-white/16 hover:text-white"
              )}
            >
              Home
            </Link>
            {navigationLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full border px-4 py-2 transition",
                  pathname === href ? "border-white/18 bg-white/10 text-white" : "border-white/8 bg-white/[0.03] text-white/64 hover:border-white/16 hover:text-white"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:items-end">
          <div className="w-full space-y-2 rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/68 xl:w-auto xl:min-w-[22rem]">
            <p>
              <span className="font-mono uppercase tracking-[0.22em] text-white/42">RPC</span>{" "}
              <span className="break-all font-mono text-white/86">{rpcEndpoint}</span>
            </p>
            <p>
              <span className="font-mono uppercase tracking-[0.22em] text-white/42">Program</span>{" "}
              {programId ? (
                <span className="font-mono text-white/86">{shortKey(programId, 6)}</span>
              ) : (
                <span className="inline-flex items-center gap-2 text-fault-flare">
                  <AlertTriangle className="size-4" />
                  Missing from environment
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-white/58">
              <RadioTower className="size-4 text-fault-flare" />
              Live wallet game
            </span>

            <WalletButton className="w-full sm:w-auto" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
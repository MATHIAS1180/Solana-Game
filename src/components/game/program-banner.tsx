"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AlertTriangle, Orbit, RadioTower } from "lucide-react";

import { getFaultlineProgramId, getRpcEndpoint, getSolanaNetwork } from "@/lib/solana/cluster";
import { cn, shortKey } from "@/lib/utils";

const navigationLinks = [
  { href: "/" as const, label: "Home" },
  { href: "/rooms" as const, label: "Arena" },
  { href: "/watch" as const, label: "Watch" },
  { href: "/leaderboard" as const, label: "Leaderboard" },
  { href: "/reserve" as const, label: "Reserve" }
];

export function ProgramBanner() {
  const pathname = usePathname();
  const network = getSolanaNetwork();
  const rpcEndpoint = getRpcEndpoint();
  const programId = getFaultlineProgramId();

  return (
    <div className="fault-card rounded-[1.9rem] p-5 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="arena-live-dot" />
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

          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-white/52">
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
            <Link href="/#how-it-works" className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-white/64 transition hover:border-white/16 hover:text-white">
              Mechanics
            </Link>
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

            <WalletMultiButton className="!h-auto !w-full !rounded-full !bg-fault-ember !px-5 !py-3 !font-display !text-sm !font-semibold !uppercase !tracking-[0.2em] !text-fault-basalt sm:!w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
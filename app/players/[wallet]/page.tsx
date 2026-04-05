import type { Metadata } from "next";
import { PublicKey } from "@solana/web3.js";

import { ProgramBanner } from "@/components/game/program-banner";
import { PlayerDossier } from "@/components/players/player-dossier";
import { buildPlayerAnalytics } from "@/lib/faultline/analytics";
import { getAllPersistentRounds } from "@/lib/faultline/metagame-store";
import { getPersistentPlayerDossier, getReserveSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ wallet: string }> }): Promise<Metadata> {
  const { wallet } = await params;

  return {
    title: `Player ${wallet.slice(0, 6)}...${wallet.slice(-4)} | Faultline Arena`,
    description: "Visible-board player dossier for Faultline Arena, built from live Solana room state.",
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true
      }
    }
  };
}

export default async function PlayerRoute({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  try {
    new PublicKey(wallet);
  } catch {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
        <ProgramBanner />
        <div className="fault-card rounded-[2rem] p-8 text-fault-flare">Invalid wallet address.</div>
      </main>
    );
  }

  const [snapshot, reserveSnapshot, rounds] = await Promise.all([getPersistentPlayerDossier(wallet), getReserveSnapshot(), getAllPersistentRounds()]);
  const analytics = buildPlayerAnalytics(rounds, wallet);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />
      <PlayerDossier snapshot={snapshot.board} profile={snapshot.profile} reserve={reserveSnapshot.reserve} analytics={analytics} />
    </main>
  );
}
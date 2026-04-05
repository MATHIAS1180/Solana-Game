import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { ArrowRight, LockKeyhole, Sparkles, Swords, Waves } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { ROOM_STATUS, ROOM_STATUS_LABELS } from "@/lib/faultline/constants";
import { buildRoundReplaySlug } from "@/lib/faultline/metagame";
import { getPersistentMetagameSnapshot, getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";
import { deserializeRoomAccount } from "@/lib/faultline/transport";
import { formatCountdown, formatLamports, shortKey } from "@/lib/utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const DAY_SLOTS = 216_000;

export const dynamic = "force-dynamic";

function scoreLiveRoom(room: {
  status: number;
  playerCount: number;
  committedCount: number;
  revealedCount: number;
}) {
  const phaseWeight = room.status === ROOM_STATUS.Reveal ? 300 : room.status === ROOM_STATUS.Commit ? 220 : room.status === ROOM_STATUS.Open ? 140 : 0;
  return phaseWeight + room.playerCount * 10 + room.committedCount * 6 + room.revealedCount * 8;
}

function describeLiveWindow(room: {
  status: number;
  playerCount: number;
  maxPlayers: number;
  joinDeadlineSlot: string;
  commitDeadlineSlot: string;
  revealDeadlineSlot: string;
}, currentSlot: number) {
  if (room.status === ROOM_STATUS.Open) {
    if (room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0) {
      return "first seat starts the clock";
    }

    return formatCountdown(Number(room.joinDeadlineSlot) - currentSlot);
  }

  if (room.status === ROOM_STATUS.Commit) {
    return formatCountdown(Number(room.commitDeadlineSlot) - currentSlot);
  }

  if (room.status === ROOM_STATUS.Reveal) {
    return formatCountdown(Number(room.revealDeadlineSlot) - currentSlot);
  }

  return "resolved";
}

export const metadata: Metadata = {
  title: "Faultline Arena - Solana PvP Strategy Game",
  description:
    "Read the crowd. Lock your prediction. Win on skill. Faultline Arena is the on-chain PvP strategy game where human decisions determine every result.",
  alternates: {
    canonical: "/"
  },
  keywords: ["Solana PvP game", "on-chain prediction game", "crypto strategy game", "commit reveal game Solana", "blockchain strategy"],
  openGraph: {
    title: "Faultline Arena - Solana PvP Strategy Game",
    description: "Read the crowd. Lock your prediction. Win on skill.",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "Faultline Arena - Solana PvP Strategy Game",
    description: "Read the crowd. Lock your prediction. Win on skill."
  }
};

export default async function HomePage() {
  let liveRoom: Awaited<ReturnType<typeof getVisibleRoomsSnapshot>>["rooms"][number] | null = null;
  let liveRoomCount = 0;
  let currentSlot = 0;
  let recentRounds: Awaited<ReturnType<typeof getPersistentMetagameSnapshot>>["recentRounds"] = [];
  let leaderboard: Awaited<ReturnType<typeof getPersistentMetagameSnapshot>>["leaderboard"] = [];

  try {
    const [snapshot, metagame] = await Promise.all([getVisibleRoomsSnapshot(), getPersistentMetagameSnapshot(6)]);
    currentSlot = snapshot.currentSlot;
    snapshot.rooms.map(deserializeRoomAccount);
    recentRounds = metagame.recentRounds;
    leaderboard = metagame.leaderboard;

    const liveRooms = snapshot.rooms.filter((room) => room.playerCount > 0 && room.status !== ROOM_STATUS.Resolved && room.status !== ROOM_STATUS.Cancelled && room.status !== ROOM_STATUS.Emergency);
    liveRoomCount = liveRooms.length;
    liveRoom = [...liveRooms].sort((left, right) => scoreLiveRoom(right) - scoreLiveRoom(left))[0] ?? null;
  } catch {
    liveRoom = null;
  }

  const recentRound = recentRounds[0] ?? null;
  const dayRounds = currentSlot > 0 ? recentRounds.filter((round) => currentSlot - Number(round.resolveSlot) <= DAY_SLOTS) : recentRounds;
  const daySettledVolume = dayRounds.reduce((sum, round) => sum + BigInt(round.totalStakedLamports), 0n);
  const recentWinner = recentRound?.winnerWallets[0] ?? null;
  const persistentLeader = leaderboard[0] ?? null;
  const liveRoomTopShare = liveRoom
    ? BigInt(liveRoom.distributableLamports) / BigInt(Math.max(liveRoom.winnerCount, 1))
    : 0n;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Faultline Arena",
    description:
      "Faultline Arena is a Solana PvP strategy game where players predict crowd movement, commit privately, reveal later, and compete in deterministic on-chain rankings.",
    genre: ["Strategy", "PvP", "Web3"],
    gamePlatform: "Web Browser",
    applicationCategory: "Game",
    operatingSystem: "Web Browser",
    url: siteUrl || undefined
  };

  return (
    <main className="fault-section min-h-screen">
      <Script id="faultline-arena-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-10 md:px-10 lg:px-12">
        <div className="arena-shell-note arena-pop-in flex flex-col gap-3 rounded-[1.6rem] px-5 py-4 text-sm text-white/72 backdrop-blur md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-fault-flare sm:text-xs sm:tracking-[0.32em]">Faultline Arena / Solana Devnet</span>
          <span>One-transaction entry, commit-reveal PvP, no RNG, no oracle, pure player reads.</span>
        </div>

        <div className="arena-hero-shell grid gap-6 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="arena-pop-in space-y-8">
            <div className="arena-kicker">
              <Sparkles className="size-4" />
              Solana prediction strategy game
            </div>

            <div className="space-y-5">
              <h1 className="arena-hero-title max-w-5xl font-display text-[2.9rem] font-semibold leading-[0.94] text-white sm:text-6xl md:text-7xl xl:text-[5.5rem]">
                Predict the crowd. Lock the commit. Win the reveal.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-white/72 md:text-xl">
                Read the crowd, hide the read, reveal it later. Faultline keeps only the information that matters: live lane, sealed commit, public result.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/arena" className="arena-primary fault-ring w-full sm:w-auto">
                Enter the arena
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/how-it-works" className="arena-secondary w-full sm:w-auto">How it works</Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Live lanes" value={liveRoomCount} subtext="Boards currently moving in public." className="arena-fade-in" />
              <StatCard label="24h volume" value={formatLamports(daySettledVolume)} subtext={`${dayRounds.length} settled rounds`} className="arena-fade-in arena-delay-1" />
              <StatCard label="Leader" value={persistentLeader ? shortKey(persistentLeader.wallet, 5) : "-"} subtext={persistentLeader ? `${persistentLeader.roundsWon} wins` : "Waiting for persistent results"} className="arena-fade-in arena-delay-2" />
            </div>
          </div>

          <div className="space-y-4 arena-pop-in arena-delay-1">
            {liveRoom ? (
              <div className="fault-card arena-float-soft rounded-[2.2rem] p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="arena-chip" data-tone="signal">
                    <span className="arena-live-dot" />
                    Live lane
                  </span>
                  <span className="arena-chip" data-tone="flare">{formatLamports(BigInt(liveRoom.stakeLamports))}</span>
                  <span className="arena-chip">{ROOM_STATUS_LABELS[liveRoom.status]}</span>
                </div>
                <h2 className="mt-5 font-display text-3xl text-white">Enter the hottest room, not a dead lobby.</h2>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  {liveRoom.playerCount} seated, {liveRoom.committedCount} commits locked, window {describeLiveWindow(liveRoom, currentSlot)}.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StatCard label="Seats" value={`${liveRoom.playerCount}/${liveRoom.maxPlayers}`} subtext="Visible pressure right now." />
                  <StatCard label="Top share" value={formatLamports(liveRoomTopShare)} subtext="Live payout ceiling." trend="up" />
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link href={`/rooms/${liveRoom.publicKey}`} className="arena-primary w-full px-5 py-3 text-xs uppercase tracking-[0.2em] sm:w-auto">
                    Enter live lane
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/watch" className="arena-secondary w-full sm:w-auto">
                    Watch live
                  </Link>
                </div>
              </div>
            ) : (
              <div className="fault-card arena-float-soft rounded-[2.2rem] p-6 sm:p-8">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Arena state</p>
                <h2 className="mt-4 font-display text-3xl text-white">No live lane yet. The next entrant sets the tempo.</h2>
                <p className="mt-3 text-sm leading-7 text-white/70">Persistent lobbies stay armed, so the next wallet can start pressure immediately instead of creating ceremony first.</p>
                <div className="mt-5">
                  <Link href="/arena" className="arena-primary w-full px-5 py-3 text-xs uppercase tracking-[0.2em] sm:w-auto">
                    Open arena
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            )}

            {recentRound ? (
              <div className="arena-surface rounded-[1.8rem] p-5 arena-fade-in arena-delay-2">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Latest result</p>
                <p className="mt-3 text-white">
                  {recentWinner ? `Winner ${shortKey(recentWinner, 6)}` : "Latest settlement recorded"} on {formatLamports(BigInt(recentRound.stakeLamports))}.
                </p>
                <Link href={`/replay/${buildRoundReplaySlug({ room: recentRound.room, createdSlot: recentRound.createdSlot })}`} className="mt-3 inline-flex text-xs uppercase tracking-[0.2em] text-fault-flare transition hover:text-white">
                  Open replay
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <section id="how-it-works" className="grid gap-4 pb-6 md:grid-cols-3">
          {[
            ["1. Enter", "Pick a persistent stake lobby, pay the ticket, and secure your seat with a single wallet flow."],
            ["2. Commit", "Choose your zone, risk profile, and crowd forecast, then hash everything locally before sending."],
            ["3. Reveal", "Submit the exact payload later. The program proves you never changed your read after the commit."]
          ].map(([title, text]) => (
            <div key={title} className="fault-card arena-fade-in rounded-[1.7rem] p-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">{title}</p>
              <p className="mt-3 text-sm leading-7 text-white/72">{text}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 pb-10 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="fault-card arena-pop-in rounded-[1.9rem] p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Why it matters</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl text-white">The game feels tense because every read is about other players, not randomness.</h2>
            <p className="mt-4 text-sm leading-7 text-white/68 sm:text-base">
              You enter quickly, hide the forecast, then watch public truth catch up. The important moments are obvious: lane selection, lock, reveal, result.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: LockKeyhole, title: "Private commit", text: "The clear payload stays local until reveal." },
              { icon: Swords, title: "Exact reveal", text: "The program checks the original read byte-for-byte." },
              { icon: Waves, title: "Clear result", text: "Standings come from the final histogram, not luck." }
            ].map((item, index) => (
              <div key={item.title} className={`fault-card arena-fade-in rounded-[1.7rem] p-5 ${index === 1 ? "arena-delay-1" : index === 2 ? "arena-delay-2" : ""}`}>
                <item.icon className="size-5 text-fault-flare" />
                <h3 className="mt-4 font-display text-xl text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/66">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
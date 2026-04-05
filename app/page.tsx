import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { ArrowRight, Compass, LockKeyhole, Sparkles, Swords, Waves } from "lucide-react";

import { RivalryBoard } from "@/components/rooms/rivalry-board";
import { ROOM_STATUS, ROOM_STATUS_LABELS } from "@/lib/faultline/constants";
import { buildRoundReplaySlug } from "@/lib/faultline/metagame";
import { buildLiveRivalryBoard } from "@/lib/faultline/rivalry";
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
  title: "Faultline Arena | Solana PvP Strategy Game",
  description:
    "Enter Faultline Arena, the Solana PvP strategy game where players predict crowd movement, commit privately, reveal later, and climb deterministic on-chain rankings.",
  alternates: siteUrl
    ? {
        canonical: "/"
      }
    : undefined,
  openGraph: {
    title: "Faultline Arena | Solana PvP Strategy Game",
    description:
      "Predict the crowd, lock one private commit, reveal later, and compete in deterministic Solana rankings.",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "Faultline Arena | Solana PvP Strategy Game",
    description:
      "A live Solana strategy game built around one-transaction entry, commit-reveal scoring, and PvP crowd forecasting."
  }
};

export default async function HomePage() {
  let liveRoom: Awaited<ReturnType<typeof getVisibleRoomsSnapshot>>["rooms"][number] | null = null;
  let liveRoomCount = 0;
  let activeSeats = 0;
  let currentSlot = 0;
  let rivalryEntries: ReturnType<typeof buildLiveRivalryBoard> = [];
  let recentRounds: Awaited<ReturnType<typeof getPersistentMetagameSnapshot>>["recentRounds"] = [];
  let leaderboard: Awaited<ReturnType<typeof getPersistentMetagameSnapshot>>["leaderboard"] = [];

  try {
    const [snapshot, metagame] = await Promise.all([getVisibleRoomsSnapshot(), getPersistentMetagameSnapshot(6)]);
    currentSlot = snapshot.currentSlot;
    const decodedRooms = snapshot.rooms.map(deserializeRoomAccount);
    rivalryEntries = buildLiveRivalryBoard(decodedRooms);
    recentRounds = metagame.recentRounds;
    leaderboard = metagame.leaderboard;

    const liveRooms = snapshot.rooms.filter((room) => room.playerCount > 0 && room.status !== ROOM_STATUS.Resolved && room.status !== ROOM_STATUS.Cancelled && room.status !== ROOM_STATUS.Emergency);
    liveRoomCount = liveRooms.length;
    activeSeats = liveRooms.reduce((sum, room) => sum + room.playerCount, 0);
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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do you join a Faultline Arena room?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open a persistent stake lobby, choose your zone, risk band, and forecast, then sign one wallet flow that initializes the room if needed, joins, and commits."
        }
      },
      {
        "@type": "Question",
        name: "What makes Faultline Arena different from a random crypto game?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Faultline Arena is deterministic. Players compete by reading crowd behavior, committing privately, revealing later, and getting ranked from the real reveal histogram and forecast error rather than RNG oracles."
        }
      },
      {
        "@type": "Question",
        name: "Does Faultline Arena support automatic room resets and refunds?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Persistent lobbies can be advanced permissionlessly, and expired rooms below the minimum player count can be reset while refunding wallets through the protocol flow."
        }
      }
    ]
  };

  return (
    <main className="fault-grid fault-section min-h-screen">
      <Script id="faultline-arena-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, faqLd]) }} />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-10 md:px-10 lg:px-12">
        <div className="arena-fade-in flex flex-col gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/72 backdrop-blur md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-fault-flare sm:text-xs sm:tracking-[0.32em]">Faultline Arena / Solana Devnet</span>
          <span>One-transaction entry, commit-reveal PvP, no RNG, no oracle, pure player reads.</span>
        </div>

        {liveRoom ? (
          <div className="arena-fade-in mt-4 grid gap-4 rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="arena-chip" data-tone="signal">
                  <span className="arena-live-dot" />
                  Live now
                </span>
                <span className="arena-chip" data-tone="flare">{formatLamports(BigInt(liveRoom.stakeLamports))}</span>
                <span className="arena-chip">{ROOM_STATUS_LABELS[liveRoom.status]}</span>
              </div>
              <h2 className="mt-4 max-w-3xl font-display text-2xl text-white sm:text-3xl">
                The hottest lane right now is already moving. Enter before the room settles into a public read.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
                {liveRoom.playerCount} players are seated, {liveRoom.committedCount} reads are locked, and the current public window is {describeLiveWindow(liveRoom, currentSlot)}.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/72">
                <span className="arena-chip">{liveRoom.playerCount}/{liveRoom.maxPlayers} seats visible</span>
                <span className="arena-chip">Top live share {formatLamports(liveRoomTopShare)}</span>
                {recentWinner ? <span className="arena-chip">Last winner {shortKey(recentWinner, 6)}</span> : null}
              </div>
            </div>
            <div className="arena-surface rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Arena pulse</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="arena-stat rounded-2xl p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Players</p>
                  <p className="mt-2 text-2xl text-white">{liveRoom.playerCount}/{liveRoom.maxPlayers}</p>
                </div>
                <div className="arena-stat rounded-2xl p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Window</p>
                  <p className="mt-2 text-2xl text-white">{describeLiveWindow(liveRoom, currentSlot)}</p>
                </div>
                <div className="arena-stat rounded-2xl p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Settled 24h</p>
                  <p className="mt-2 text-2xl text-white">{dayRounds.length}</p>
                </div>
                <div className="arena-stat rounded-2xl p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">24h volume</p>
                  <p className="mt-2 text-xl text-white">{formatLamports(daySettledVolume)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link href={`/rooms/${liveRoom.publicKey}`} className="arena-primary w-full px-5 py-3 text-xs uppercase tracking-[0.2em] sm:w-auto">
                  Jump into live lane
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/watch" className="arena-secondary w-full sm:w-auto">
                  Open watch live
                </Link>
              </div>
              {recentRound ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/72">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fault-flare">Latest settlement</p>
                  <p className="mt-2 text-white">
                    {recentWinner ? `Winner ${shortKey(recentWinner, 6)}` : "No winner recorded"} on {formatLamports(BigInt(recentRound.stakeLamports))}.
                  </p>
                  <Link href={`/replay/${buildRoundReplaySlug({ room: recentRound.room, createdSlot: recentRound.createdSlot })}`} className="mt-3 inline-flex text-xs uppercase tracking-[0.2em] text-fault-flare transition hover:text-white">
                    Open replay
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {rivalryEntries.length > 0 ? (
          <div className="mt-4 arena-fade-in">
            <RivalryBoard
              entries={rivalryEntries.slice(0, 3)}
              eyebrow="Live Rivalry"
              title="The same wallets are already pressuring multiple lanes."
              summary="This ranking is built from visible on-chain room state only: live seats, locked commits, revealed reads, and payouts still sitting on the board."
              ctaHref="/rooms"
              ctaLabel="Open full board"
            />
          </div>
        ) : null}

        <div className="grid gap-10 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="arena-fade-in space-y-8">
            <div className="arena-kicker">
              <Sparkles className="size-4" />
              Solana prediction strategy game
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl font-display text-[2.9rem] font-semibold leading-[0.94] text-white sm:text-6xl md:text-7xl xl:text-[5.5rem]">
                Predict the crowd. Lock the commit. Win the reveal.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-white/72 md:text-xl">
                Faultline Arena is the live frontend for a deterministic Solana PvP strategy game. Every player secretly picks a zone,
                a risk band, and a crowd forecast, then reveals the exact read later to compete in transparent on-chain rankings.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/rooms" className="arena-primary fault-ring w-full sm:w-auto">
                Enter the arena
                <ArrowRight className="size-4" />
              </Link>
              <a href="#how-it-works" className="arena-secondary w-full sm:w-auto">
                Explore the mechanics
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["1 Tx entry", "Create if needed, join, and commit from one wallet flow."],
                [
                  recentWinner ? `Winner ${shortKey(recentWinner, 5)}` : liveRoomCount > 0 ? `${liveRoomCount} live lane${liveRoomCount === 1 ? "" : "s"}` : "Deterministic scoring",
                  recentWinner ? "The board is not theoretical anymore. A visible wallet has already closed the last resolved round." : liveRoomCount > 0 ? "Seats are already filling across the visible board. Pressure is public before the actual reads are." : "Ranks come from real reveals, forecast error, and risk-weighted outcomes."
                ],
                [
                  daySettledVolume > 0n ? formatLamports(daySettledVolume) : activeSeats > 0 ? `${activeSeats} seats filled` : "Live persistent lobbies",
                  daySettledVolume > 0n ? `${dayRounds.length} resolved round${dayRounds.length === 1 ? "" : "s"} fed the board over the last 24h.` : activeSeats > 0 ? "Players are already distributed across the board, so entry feels like jumping into pressure instead of starting from zero." : "Every stake tier stays visible so players can jump into active action faster."
                ],
                [
                  persistentLeader ? `Leader ${shortKey(persistentLeader.wallet, 5)}` : "Public ladder",
                  persistentLeader ? `The persistent board leader is already visible, with ${persistentLeader.roundsWon} wins and ${formatLamports(BigInt(persistentLeader.totalPayoutLamports))} paid out.` : "The long-form ladder tracks who keeps shaping the board, not just one isolated room."
                ]
              ].map(([title, text]) => (
                <div key={title} className="arena-stat rounded-[1.5rem] p-4">
                  <p className="font-display text-lg text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/62">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="fault-card arena-fade-in rounded-[2.2rem] p-6 sm:p-8">
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.24em] text-white/50">
              <span>Core loop</span>
              <span>5 zones / 3 risks</span>
            </div>
            <div className="mt-8 space-y-6">
              {[
                {
                  icon: LockKeyhole,
                  title: "Private commit",
                  text: "The client hashes your canonical payload locally, so the chain only sees the commitment until reveal time."
                },
                {
                  icon: Swords,
                  title: "Verifiable reveal",
                  text: "Zone, risk band, forecast, and nonce are checked byte-for-byte against the stored commit."
                },
                {
                  icon: Waves,
                  title: "Deterministic resolution",
                  text: "Final standings come from the real reveal histogram, forecast error, and risk logic. No hidden referee."
                }
              ].map((item) => (
                <div key={item.title} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                  <item.icon className="size-5 text-fault-signal" />
                  <h2 className="mt-4 font-display text-xl text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-white/68">{item.text}</p>
                </div>
              ))}
            </div>
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

        <section className="grid gap-4 pb-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="fault-card arena-fade-in rounded-[1.9rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Why it stands out</p>
            <h2 className="mt-4 font-display text-3xl text-white">Built for players who want readable, provable strategy.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                Icon: Compass,
                title: "Crowd reading",
                text: "You are not predicting a price chart. You are predicting where real players will cluster."
              },
              {
                Icon: Sparkles,
                title: "Readable risk",
                text: "Calm, Edge, and Knife let players trade consistency for explosive upside."
              },
              {
                Icon: Swords,
                title: "Permissionless flow",
                text: "Timeouts, resolution, and claims stay open to any visitor so matches keep moving."
              }
            ].map(({ Icon, title, text }) => (
              <div key={title} className="fault-card arena-fade-in rounded-[1.7rem] p-5">
                <Icon className="size-5 text-fault-flare" />
                <h3 className="mt-4 font-display text-xl text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/66">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fault-card arena-fade-in rounded-[1.9rem] p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Search Intent</p>
          <h2 className="mt-4 max-w-3xl font-display text-3xl text-white">Faultline Arena is built for players searching for a real Solana strategy game, not another luck-driven mint funnel.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/68 sm:text-base">
            If users are looking for a Solana PvP game, a crypto strategy game, an on-chain prediction game, or a commit-reveal game with readable mechanics, Faultline Arena answers that intent with persistent lobbies, deterministic rankings, and wallet-native play.
          </p>
        </section>

        <section className="grid gap-4 pb-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="fault-card arena-fade-in rounded-[1.9rem] p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Player Tension</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl text-white">The game loop is sticky because every round creates social pressure, not fake urgency.</h2>
            <p className="mt-4 text-sm leading-7 text-white/68 sm:text-base">
              You are reading other humans, not random numbers. That creates a strong loop of anticipation, regret, adjustment, and return play that feels competitive instead of manipulative.
            </p>
            <p className="arena-quote mt-6 text-sm leading-7">
              The best retention lever here is not noise. It is the feeling that one sharper read could flip the whole room.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Open tension", "Persistent lobbies make the next decision feel immediate instead of hidden behind setup friction."],
              ["Near-miss learning", "Result screens explain where the read broke down, which turns losses into a reason to re-enter."],
              ["Social forecasting", "Every commit is a statement about how you think other players will behave under pressure."]
            ].map(([title, text], index) => (
              <div key={title} className={`fault-card arena-fade-in rounded-[1.7rem] p-5 ${index === 1 ? "arena-delay-1" : index === 2 ? "arena-delay-2" : ""}`}>
                <p className="font-display text-xl text-white">{title}</p>
                <p className="mt-3 text-sm leading-7 text-white/66">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fault-card arena-fade-in rounded-[1.9rem] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">FAQ</p>
              <h2 className="mt-4 font-display text-3xl text-white">Questions players ask before they enter the arena.</h2>
            </div>
            <Link href="/rooms" className="arena-secondary w-full sm:w-auto">
              Browse live lobbies
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Is Faultline Arena random?",
                "No. The game is deterministic. Outcomes come from player reveals, forecast error, and risk logic rather than RNG or oracle feeds."
              ],
              [
                "Why does one-transaction entry matter?",
                "It removes setup drag. If the room exists, you join and commit in one wallet action. If it does not, the same flow can initialize it first."
              ],
              [
                "Why would players come back after losing?",
                "Because the game explains the miss. You can see where your read diverged from the final crowd distribution and adjust the next round with intent."
              ]
            ].map(([title, text], index) => (
              <div key={title} className={`arena-surface rounded-[1.6rem] p-5 ${index === 1 ? "arena-delay-1 arena-fade-in" : index === 2 ? "arena-delay-2 arena-fade-in" : "arena-fade-in"}`}>
                <p className="font-display text-xl text-white">{title}</p>
                <p className="mt-3 text-sm leading-7 text-white/66">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
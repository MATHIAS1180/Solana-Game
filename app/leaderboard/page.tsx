import Link from "next/link";

import { ProgramBanner } from "@/components/game/program-banner";
import { buildRoundReplaySlug } from "@/lib/faultline/metagame";
import { getPersistentMetagameSnapshot } from "@/lib/faultline/server-data";
import { formatLamports, shortKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const snapshot = await getPersistentMetagameSnapshot(20);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Persistent Leaderboard</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl">Career pressure, paid finishes, and accuracy now survive beyond a single room.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          This board is built from resolved rounds captured as the live system rooms rotate. It turns Faultline from a good room loop into a readable long-term rivalry layer.
        </p>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="arena-kicker">Fresh Replays</p>
            <h2 className="mt-3 font-display text-2xl text-white">The most recent rounds that now deserve post-mortem attention.</h2>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {snapshot.recentRounds.length > 0 ? (
            snapshot.recentRounds.slice(0, 6).map((round) => (
              <div key={round.id} className="arena-surface rounded-[1.5rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-display text-xl text-white">{formatLamports(BigInt(round.stakeLamports))} Arena</p>
                    <p className="mt-1 text-sm text-white/68">Histogram [{round.finalHistogram.join(", ")}] / winner {round.winnerWallets[0] ? shortKey(round.winnerWallets[0], 6) : "unknown"}</p>
                  </div>
                  <Link href={`/replay/${buildRoundReplaySlug({ room: round.room, createdSlot: round.createdSlot })}`} className="arena-secondary px-5 py-3 text-xs uppercase tracking-[0.2em]">
                    Open replay
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="arena-surface rounded-[1.5rem] p-5 text-sm leading-7 text-white/68">
              No replay is available yet because no resolved round has been persisted.
            </div>
          )}
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="arena-kicker">Top Wallets</p>
            <h2 className="mt-3 font-display text-2xl text-white">The current metagame ladder.</h2>
          </div>
          <p className="text-sm text-white/62">{snapshot.leaderboard.length} wallet{snapshot.leaderboard.length === 1 ? "" : "s"} ranked</p>
        </div>

        <div className="mt-6 space-y-3">
          {snapshot.leaderboard.length > 0 ? (
            snapshot.leaderboard.map((entry, index) => (
              <div key={entry.wallet} className="arena-stat rounded-[1.5rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/25 font-mono text-sm text-white/78">#{index + 1}</div>
                    <div>
                      <Link href={`/players/${entry.wallet}`} className="font-display text-xl text-white transition hover:text-fault-flare">
                        {shortKey(entry.wallet, 6)}
                      </Link>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-fault-flare">Score {entry.score} / {Math.round(entry.winRate * 100)}% win rate</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg text-white">{formatLamports(BigInt(entry.totalPayoutLamports))}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">career payout</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/68 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">Rounds {entry.roundsPlayed}</div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">Wins {entry.roundsWon}</div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">Avg error {entry.averageError === null ? "-" : entry.averageError.toFixed(1)}</div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">Best score {entry.bestScoreBps ?? "-"}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="arena-surface rounded-[1.5rem] p-5 text-sm leading-7 text-white/68">
              No resolved round has been persisted yet. Once rooms start settling through the live board, the leaderboard will populate automatically.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
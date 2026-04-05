import Link from "next/link";

import { ProgramBanner } from "@/components/game/program-banner";
import { buildRoundReplaySlug } from "@/lib/faultline/metagame";
import { getPersistentMetagameSnapshot } from "@/lib/faultline/server-data";
import { formatLamports, shortKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const snapshot = await getPersistentMetagameSnapshot(20);
  const podium = snapshot.leaderboard.slice(0, 3);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card arena-stage-shell relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="arena-kicker">Persistent Leaderboard</p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl">Career pressure, paid finishes, and accuracy now survive beyond a single room.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
              This board is built from resolved rounds captured as the live system rooms rotate. It turns Faultline from a good room loop into a readable long-term rivalry layer.
            </p>
          </div>
          <div className="arena-editorial-panel rounded-[1.8rem] p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Ladder pulse</p>
            <h2 className="mt-3 font-display text-2xl text-white">The table that makes every close miss matter later.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Ranked wallets</p>
                <p className="mt-2 text-2xl text-white">{snapshot.leaderboard.length}</p>
              </div>
              <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Fresh replays</p>
                <p className="mt-2 text-2xl text-white">{snapshot.recentRounds.length}</p>
              </div>
              <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Top score</p>
                <p className="mt-2 text-2xl text-white">{snapshot.leaderboard[0]?.score ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {podium.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {podium.map((entry, index) => (
            <div key={entry.wallet} className="arena-stat arena-podium-card rounded-[1.8rem] p-5 sm:p-6" data-rank={index + 1}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">Podium #{index + 1}</p>
                  <Link href={`/players/${entry.wallet}`} className="mt-3 block font-display text-2xl text-white transition hover:text-fault-flare">
                    {shortKey(entry.wallet, 6)}
                  </Link>
                </div>
                <span className="arena-chip" data-tone={index === 0 ? "flare" : index === 1 ? "signal" : "ember"}>Score {entry.score}</span>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-white/72">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">Payout {formatLamports(BigInt(entry.totalPayoutLamports))}</div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">Wins {entry.roundsWon} / {entry.roundsPlayed} rounds</div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">Win rate {Math.round(entry.winRate * 100)}%</div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

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
              <div key={round.id} className="arena-surface arena-broadcast-card rounded-[1.5rem] p-4 sm:p-5">
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
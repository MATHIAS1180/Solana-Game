import Link from "next/link";
import type { Metadata } from "next";

import { ProgramBanner } from "@/components/game/program-banner";
import { StatCard } from "@/components/ui/stat-card";
import {
  buildLeaderboardFromRounds,
  filterRounds,
  parseLeaderboardPeriod,
  parseLeaderboardSort,
  parseStakeFilter,
  type LeaderboardPeriod,
  type LeaderboardSort
} from "@/lib/faultline/analytics";
import { buildRoundReplaySlug } from "@/lib/faultline/metagame";
import { getAllPersistentRounds } from "@/lib/faultline/metagame-store";
import { formatLamports, shortKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Rankings of the best Faultline Arena players by payout, win rate, and forecast precision.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "Leaderboard - Faultline Arena",
    description: "Track the best Faultline Arena players across payout, win rate, and forecast quality.",
    url: "/leaderboard"
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard - Faultline Arena",
    description: "Track the best Faultline Arena players across payout, win rate, and forecast quality."
  }
};

const PERIOD_OPTIONS: ReadonlyArray<{ label: string; value: LeaderboardPeriod }> = [
  { label: "All time", value: "all" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" }
];

const SORT_OPTIONS: ReadonlyArray<{ label: string; value: LeaderboardSort }> = [
  { label: "Score", value: "score" },
  { label: "Payout", value: "payout" },
  { label: "Win Rate", value: "win-rate" },
  { label: "Accuracy", value: "accuracy" },
  { label: "Volume", value: "volume" }
];

function buildFilterHref(input: { period: LeaderboardPeriod; sort: LeaderboardSort; stake: string | null }) {
  const params = new URLSearchParams();

  if (input.period !== "all") {
    params.set("period", input.period);
  }

  if (input.sort !== "score") {
    params.set("sort", input.sort);
  }

  if (input.stake && input.stake !== "all") {
    params.set("stake", input.stake);
  }

  const query = params.toString();
  return query ? `/leaderboard?${query}` : "/leaderboard";
}

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string; sort?: string; stake?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const period = parseLeaderboardPeriod(resolvedSearchParams.period ?? null);
  const sort = parseLeaderboardSort(resolvedSearchParams.sort ?? null);
  const stakeLamports = parseStakeFilter(resolvedSearchParams.stake ?? null);
  const allRounds = await getAllPersistentRounds();
  const filteredRounds = filterRounds(allRounds, { period, stakeLamports });
  const leaderboard = buildLeaderboardFromRounds(filteredRounds, sort).slice(0, 20);
  const podium = leaderboard.slice(0, 3);
  const visibleReplays = filteredRounds.slice(0, 6);
  const totalVolumeLamports = filteredRounds.reduce((sum, round) => sum + BigInt(round.totalStakedLamports), 0n);
  const uniqueStakes = [...new Set(allRounds.map((round) => round.stakeLamports))]
    .sort((left, right) => Number(BigInt(left) - BigInt(right)))
    .map((value) => ({ value, label: formatLamports(BigInt(value)) }));
  const selectedStakeValue = stakeLamports?.toString() ?? "all";
  const currentFilterSummary = `${PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "All time"} / ${SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Score"}${stakeLamports ? ` / ${formatLamports(stakeLamports)}` : " / All stakes"}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card arena-stage-shell arena-pop-in relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="arena-kicker">Persistent Leaderboard</p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl">Only the strongest reads stay visible here.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
              Filter the history, then read the ladder. No side panels, no filler metrics, just ranking pressure.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-white/42">Active filters: {currentFilterSummary}</p>
          </div>
          <div className="arena-editorial-panel rounded-[1.8rem] p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Ladder pulse</p>
            <h2 className="mt-3 font-display text-2xl text-white">A single view of who is actually converting reads into results.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="Ranked wallets" value={leaderboard.length} subtext="Wallets surviving the current filter set." className="arena-proof-card rounded-2xl" />
              <StatCard label="Filtered rounds" value={filteredRounds.length} subtext="Resolved rounds contributing to this ladder." className="arena-proof-card rounded-2xl" />
              <StatCard label="Top score" value={leaderboard[0]?.score ?? 0} subtext={`Volume ${formatLamports(totalVolumeLamports)}`} className="arena-proof-card rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8 arena-fade-in">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="arena-kicker">Filters</p>
            <h2 className="mt-3 font-display text-2xl text-white">Time, stake, sort. Nothing else.</h2>
            <p className="mt-3 text-sm leading-7 text-white/68">Each change rebuilds the ranking server-side from persisted rounds.</p>
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Period</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((option) => (
                  <a
                    key={option.value}
                    href={buildFilterHref({ period: option.value, sort, stake: selectedStakeValue === "all" ? null : selectedStakeValue })}
                    className="arena-chip"
                    data-tone={period === option.value ? "flare" : undefined}
                  >
                    {option.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Sort</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <a
                    key={option.value}
                    href={buildFilterHref({ period, sort: option.value, stake: selectedStakeValue === "all" ? null : selectedStakeValue })}
                    className="arena-chip"
                    data-tone={sort === option.value ? "signal" : undefined}
                  >
                    {option.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={buildFilterHref({ period, sort, stake: null })} className="arena-chip" data-tone={selectedStakeValue === "all" ? "ember" : undefined}>
                  All stakes
                </a>
                {uniqueStakes.map((stake) => (
                  <a
                    key={stake.value}
                    href={buildFilterHref({ period, sort, stake: `lamports:${stake.value}` })}
                    className="arena-chip"
                    data-tone={selectedStakeValue === stake.value ? "ember" : undefined}
                  >
                    {stake.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {podium.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {podium.map((entry, index) => (
            <div key={entry.wallet} className={`arena-stat arena-podium-card rounded-[1.8rem] p-5 sm:p-6 arena-fade-in ${index === 1 ? "arena-delay-1" : index === 2 ? "arena-delay-2" : ""}`} data-rank={index + 1}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">Podium #{index + 1}</p>
                  <Link href={`/profile/${entry.wallet}`} className="mt-3 block font-display text-2xl text-white transition hover:text-fault-flare">
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

      <section className="fault-card rounded-[2rem] p-6 sm:p-8 arena-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="arena-kicker">Top Wallets</p>
            <h2 className="mt-3 font-display text-2xl text-white">Current ladder.</h2>
          </div>
          <p className="text-sm text-white/62">{leaderboard.length} wallet{leaderboard.length === 1 ? "" : "s"} ranked</p>
        </div>

        <div className="mt-6 space-y-3">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <div key={entry.wallet} className="arena-stat rounded-[1.5rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/25 font-mono text-sm text-white/78">#{index + 1}</div>
                    <div>
                      <Link href={`/profile/${entry.wallet}`} className="font-display text-xl text-white transition hover:text-fault-flare">
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
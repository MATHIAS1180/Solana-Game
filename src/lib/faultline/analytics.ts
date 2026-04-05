import {
  applyRoundToPersistentProfile,
  buildPersistentLeaderboard,
  createEmptyPersistentPlayerProfile,
  type PersistentLeaderboardEntry,
  type PersistentPlayerProfile,
  type PersistentRoundEntry
} from "@/lib/faultline/metagame";
import { RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";

const SLOTS_PER_DAY = 216000;

export type LeaderboardPeriod = "all" | "7d" | "30d" | "90d";
export type LeaderboardSort = "score" | "payout" | "win-rate" | "accuracy" | "volume";

export function parseLeaderboardPeriod(value: string | null): LeaderboardPeriod {
  if (value === "7d" || value === "30d" || value === "90d") {
    return value;
  }

  return "all";
}

export function parseLeaderboardSort(value: string | null): LeaderboardSort {
  if (value === "payout" || value === "win-rate" || value === "accuracy" || value === "volume") {
    return value;
  }

  return "score";
}

export function parseStakeFilter(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  if (value.startsWith("lamports:")) {
    const lamports = value.slice("lamports:".length);
    if (!/^\d+$/.test(lamports)) {
      return null;
    }
    return BigInt(lamports);
  }

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return null;
  }

  return BigInt(Math.round(asNumber * 1_000_000_000));
}

export function filterRounds(rounds: PersistentRoundEntry[], options: { period: LeaderboardPeriod; stakeLamports: bigint | null }) {
  const maxResolveSlot = rounds.reduce((highest, round) => {
    const slot = BigInt(round.resolveSlot);
    return slot > highest ? slot : highest;
  }, 0n);

  let minResolveSlot = 0n;
  if (options.period !== "all") {
    const days = options.period === "7d" ? 7 : options.period === "30d" ? 30 : 90;
    minResolveSlot = maxResolveSlot > BigInt(days * SLOTS_PER_DAY) ? maxResolveSlot - BigInt(days * SLOTS_PER_DAY) : 0n;
  }

  return rounds.filter((round) => {
    if (options.stakeLamports !== null && BigInt(round.stakeLamports) !== options.stakeLamports) {
      return false;
    }

    if (options.period !== "all" && BigInt(round.resolveSlot) < minResolveSlot) {
      return false;
    }

    return true;
  });
}

export function buildLeaderboardFromRounds(rounds: PersistentRoundEntry[], sort: LeaderboardSort) {
  const profiles = new Map<string, PersistentPlayerProfile>();

  for (const round of rounds) {
    for (const line of round.lines) {
      const current = profiles.get(line.wallet) ?? createEmptyPersistentPlayerProfile(line.wallet);
      profiles.set(line.wallet, applyRoundToPersistentProfile(current, round));
    }
  }

  const leaderboard = buildPersistentLeaderboard([...profiles.values()]);

  return [...leaderboard].sort((left, right) => sortLeaderboardEntries(left, right, sort));
}

function sortLeaderboardEntries(left: PersistentLeaderboardEntry, right: PersistentLeaderboardEntry, sort: LeaderboardSort) {
  if (sort === "payout") {
    const delta = BigInt(right.totalPayoutLamports) - BigInt(left.totalPayoutLamports);
    if (delta !== 0n) {
      return delta > 0n ? 1 : -1;
    }
  }

  if (sort === "win-rate") {
    if (right.winRate !== left.winRate) {
      return right.winRate - left.winRate;
    }
    if (right.roundsWon !== left.roundsWon) {
      return right.roundsWon - left.roundsWon;
    }
  }

  if (sort === "accuracy") {
    const leftError = left.averageError ?? Number.POSITIVE_INFINITY;
    const rightError = right.averageError ?? Number.POSITIVE_INFINITY;
    if (leftError !== rightError) {
      return leftError - rightError;
    }
    if ((right.bestScoreBps ?? 0) !== (left.bestScoreBps ?? 0)) {
      return (right.bestScoreBps ?? 0) - (left.bestScoreBps ?? 0);
    }
  }

  if (sort === "volume") {
    const delta = BigInt(right.totalStakeLamports) - BigInt(left.totalStakeLamports);
    if (delta !== 0n) {
      return delta > 0n ? 1 : -1;
    }
  }

  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return Number(BigInt(right.totalPayoutLamports) - BigInt(left.totalPayoutLamports));
}

export function buildPlayerAnalytics(rounds: PersistentRoundEntry[], wallet: string) {
  const entries = rounds
    .map((round) => {
      const line = round.lines.find((candidate) => candidate.wallet === wallet);
      return line ? { round, line } : null;
    })
    .filter((entry): entry is { round: PersistentRoundEntry; line: PersistentRoundEntry["lines"][number] } => Boolean(entry))
    .sort((left, right) => Number(BigInt(right.round.resolveSlot) - BigInt(left.round.resolveSlot)));

  const zoneCounts = Array.from({ length: ZONE_LABELS.length }, (_, index) => ({
    index,
    label: ZONE_LABELS[index],
    count: entries.filter((entry) => entry.line.zone === index).length
  }));
  const riskCounts = Array.from({ length: RISK_LABELS.length }, (_, index) => ({
    index,
    label: RISK_LABELS[index],
    count: entries.filter((entry) => entry.line.riskBand === index).length
  }));
  const finished = entries.filter((entry) => entry.line.finish !== null);
  const payouts = entries.filter((entry) => BigInt(entry.line.rewardLamports) > 0n);
  const averageFinish = finished.length > 0 ? finished.reduce((sum, entry) => sum + (entry.line.finish ?? 0), 0) / finished.length : null;
  const recentForm = entries.slice(0, 8).map((entry) => ({
    id: entry.round.id,
    resolveSlot: entry.round.resolveSlot,
    stakeLamports: entry.round.stakeLamports,
    finish: entry.line.finish,
    rewardLamports: entry.line.rewardLamports,
    error: entry.line.error,
    zone: entry.line.zone,
    riskBand: entry.line.riskBand
  }));

  return {
    favoriteZone: zoneCounts.reduce((best, current) => (current.count > best.count ? current : best), zoneCounts[0] ?? null),
    favoriteRisk: riskCounts.reduce((best, current) => (current.count > best.count ? current : best), riskCounts[0] ?? null),
    zoneCounts,
    riskCounts,
    paidFinishes: payouts.length,
    bestFinish: finished.reduce<number | null>((best, entry) => {
      const finish = entry.line.finish;
      if (finish === null) {
        return best;
      }
      if (best === null || finish < best) {
        return finish;
      }
      return best;
    }, null),
    averageFinish,
    recentForm,
    currentCashStreak: countLeading(entries, (entry) => BigInt(entry.line.rewardLamports) > 0n),
    bestCashStreak: countBest(entries, (entry) => BigInt(entry.line.rewardLamports) > 0n),
    currentRevealStreak: countLeading(entries, (entry) => entry.line.error !== null),
    bestRevealStreak: countBest(entries, (entry) => entry.line.error !== null)
  };
}

export type PlayerAnalytics = ReturnType<typeof buildPlayerAnalytics>;

function countLeading<T>(items: T[], predicate: (value: T) => boolean) {
  let count = 0;
  for (const item of items) {
    if (!predicate(item)) {
      break;
    }
    count += 1;
  }
  return count;
}

function countBest<T>(items: T[], predicate: (value: T) => boolean) {
  let best = 0;
  let current = 0;
  for (const item of items) {
    if (predicate(item)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}
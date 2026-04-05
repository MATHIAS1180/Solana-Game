import type { PersistentLeaderboardEntry, PersistentPlayerProfile } from "@/lib/faultline/metagame";
import type { SerializedFaultlineReserveAccount } from "@/lib/faultline/transport";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getReserveAvailableLamports(reserve: SerializedFaultlineReserveAccount) {
  return BigInt(reserve.totalCollectedLamports) - BigInt(reserve.totalDistributedLamports);
}

export function getReserveDistributionRate(reserve: SerializedFaultlineReserveAccount) {
  const collected = BigInt(reserve.totalCollectedLamports);
  if (collected <= 0n) {
    return 0;
  }

  return Number(BigInt(reserve.totalDistributedLamports) * 10_000n / collected) / 100;
}

export function getPlayerTimeoutRate(profile: PersistentPlayerProfile) {
  if (profile.committedRounds === 0) {
    return null;
  }

  return profile.timeoutCount / profile.committedRounds;
}

export function getPlayerRevealRate(profile: PersistentPlayerProfile) {
  if (profile.committedRounds === 0) {
    return null;
  }

  return profile.revealedRounds / profile.committedRounds;
}

export function getFairAccessReadiness(profile: PersistentPlayerProfile, reserve: SerializedFaultlineReserveAccount | null) {
  const timeoutRate = getPlayerTimeoutRate(profile);
  const revealRate = getPlayerRevealRate(profile);

  if (profile.roundsPlayed === 0 || timeoutRate === null || revealRate === null) {
    return {
      score: 0,
      tone: "ember" as const,
      label: "Not enough public data",
      description: reserve?.freeAccessEnabled
        ? "The reserve rail is live on-chain, but this wallet has not built enough public discipline data yet."
        : "This wallet has not built enough public discipline data yet, and free-access claim UX is not live anyway.",
      timeoutRate,
      revealRate
    };
  }

  const reliability = 1 - timeoutRate;
  const experienceBoost = Math.min(profile.roundsPlayed, 20) * 0.9;
  const winBoost = Math.min(profile.roundsWon, 10) * 0.8;
  const revealBoost = revealRate * 22;
  const timeoutPenalty = timeoutRate * 48;
  const score = clamp(Math.round(42 + experienceBoost + winBoost + revealBoost - timeoutPenalty), 0, 100);

  if (score >= 78) {
    return {
      score,
      tone: "signal" as const,
      label: "Strong public discipline",
      description: reserve?.freeAccessEnabled
        ? "This wallet is building the kind of low-timeout, high-reveal footprint that a future free-access rail should be able to reward."
        : "This wallet is building the kind of low-timeout, high-reveal footprint that could justify future reserve-backed aid once claim UX opens.",
      timeoutRate,
      revealRate
    };
  }

  if (score >= 56) {
    return {
      score,
      tone: "flare" as const,
      label: "Stable but still mixed",
      description: "This wallet has enough clean public rounds to look credible, but timeout discipline can still improve before any fair-access case would feel obvious.",
      timeoutRate,
      revealRate
    };
  }

  return {
    score,
    tone: "ember" as const,
    label: "Fragile reserve posture",
    description: "The visible history still carries too many missed reveals or too little volume to read as a strong candidate for reserve-backed relief.",
    timeoutRate,
    revealRate
  };
}

export function buildReserveDisciplineBoard(entries: PersistentLeaderboardEntry[]) {
  return [...entries]
    .filter((entry) => entry.roundsPlayed > 0)
    .sort((left, right) => {
      if (left.timeoutCount !== right.timeoutCount) {
        return left.timeoutCount - right.timeoutCount;
      }
      if (right.roundsPlayed !== left.roundsPlayed) {
        return right.roundsPlayed - left.roundsPlayed;
      }
      return right.roundsWon - left.roundsWon;
    })
    .slice(0, 5);
}

import { describe, expect, it } from "vitest";

import { buildReserveDisciplineBoard, getFairAccessReadiness, getReserveAvailableLamports, getReserveDistributionRate } from "@/lib/faultline/fair-access";
import type { PersistentLeaderboardEntry, PersistentPlayerProfile } from "@/lib/faultline/metagame";
import type { SerializedFaultlineReserveAccount } from "@/lib/faultline/transport";

const reserve: SerializedFaultlineReserveAccount = {
  publicKey: "reserve",
  version: 1,
  bump: 1,
  paused: false,
  freeAccessEnabled: true,
  totalCollectedLamports: "1000",
  totalDistributedLamports: "250",
  antiGriefCollectedLamports: "150",
  revealTimeoutCollectedLamports: "100",
  freeAccessDistributedLamports: "50",
  authority: "authority"
};

const stableProfile: PersistentPlayerProfile = {
  wallet: "wallet",
  roundsPlayed: 12,
  roundsWon: 4,
  podiums: 5,
  committedRounds: 12,
  revealedRounds: 11,
  timeoutCount: 1,
  totalStakeLamports: "1000",
  totalPayoutLamports: "900",
  cumulativeError: 20,
  errorSamples: 11,
  averageError: 1.8,
  bestScoreBps: 9400,
  lastSeenResolveSlot: "10",
  recentRounds: []
};

describe("fair access helpers", () => {
  it("computes reserve availability and distribution rate", () => {
    expect(getReserveAvailableLamports(reserve)).toBe(750n);
    expect(getReserveDistributionRate(reserve)).toBe(25);
  });

  it("scores stable public discipline above fragile posture", () => {
    const readiness = getFairAccessReadiness(stableProfile, reserve);
    expect(readiness.score).toBeGreaterThanOrEqual(56);
    expect(readiness.timeoutRate).toBeCloseTo(1 / 12);
    expect(readiness.revealRate).toBeCloseTo(11 / 12);
  });

  it("sorts discipline board by lowest timeouts then activity", () => {
    const entries: PersistentLeaderboardEntry[] = [
      {
        wallet: "a",
        score: 120,
        roundsPlayed: 10,
        roundsWon: 2,
        winRate: 0.2,
        averageError: 2,
        totalPayoutLamports: "10",
        totalStakeLamports: "10",
        bestScoreBps: 9000,
        timeoutCount: 2
      },
      {
        wallet: "b",
        score: 120,
        roundsPlayed: 6,
        roundsWon: 3,
        winRate: 0.5,
        averageError: 2,
        totalPayoutLamports: "10",
        totalStakeLamports: "10",
        bestScoreBps: 9000,
        timeoutCount: 0
      }
    ];

    expect(buildReserveDisciplineBoard(entries)[0]?.wallet).toBe("b");
  });
});

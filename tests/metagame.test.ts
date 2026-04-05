import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import { applyRoundToPersistentProfile, buildPersistentLeaderboard, buildRoundReplaySlug, createEmptyPersistentPlayerProfile, parseRoundReplaySlug, summarizeResolvedRound } from "@/lib/faultline/metagame";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";

const EMPTY_KEY = new PublicKey(new Uint8Array(32));

function createRoom(overrides: Partial<FaultlineRoomAccount>): FaultlineRoomAccount {
  return {
    publicKey: new PublicKey(new Uint8Array(32).fill(9)),
    version: 1,
    roomBump: 0,
    vaultBump: 0,
    status: ROOM_STATUS.Resolved,
    zoneCount: 5,
    minPlayers: 2,
    maxPlayers: 12,
    playerCount: 2,
    committedCount: 2,
    revealedCount: 2,
    activeCount: 2,
    winnerCount: 2,
    presetId: 0,
    flags: 0,
    stakeLamports: 80_000_000n,
    totalStakedLamports: 160_000_000n,
    distributableLamports: 156_800_000n,
    reserveFeeLamports: 3_200_000n,
    slashedToReserveLamports: 0n,
    createdSlot: 100n,
    joinDeadlineSlot: 160n,
    joinDurationSlots: 60n,
    commitDurationSlots: 40n,
    commitDeadlineSlot: 200n,
    revealDurationSlots: 40n,
    revealDeadlineSlot: 240n,
    resolveSlot: 260n,
    creator: EMPTY_KEY,
    vault: EMPTY_KEY,
    reserve: EMPTY_KEY,
    treasury: EMPTY_KEY,
    roomSeed: new Uint8Array(32),
    finalHistogram: [1, 1, 0, 0, 0],
    winnerIndices: [0, 1, 255, 255],
    payoutBps: [7200, 1800, 800, 0],
    playerKeys: Array.from({ length: 12 }, () => EMPTY_KEY),
    playerStatuses: Array.from({ length: 12 }, () => 0) as FaultlineRoomAccount["playerStatuses"],
    playerClaimed: Array.from({ length: 12 }, () => false),
    playerZones: Array.from({ length: 12 }, () => 0),
    playerRisks: Array.from({ length: 12 }, () => 0),
    playerCommitHashes: Array.from({ length: 12 }, () => new Uint8Array(32)),
    playerForecasts: Array.from({ length: 12 }, () => [0, 0, 0, 0, 0] as [number, number, number, number, number]),
    playerErrors: Array.from({ length: 12 }, () => 0),
    playerScoresBps: Array.from({ length: 12 }, () => 0),
    playerRewardsLamports: Array.from({ length: 12 }, () => 0n),
    ...overrides
  };
}

describe("persistent metagame", () => {
  it("summarizes a resolved room into a persistent round", () => {
    const left = new PublicKey(new Uint8Array(32).fill(7));
    const right = new PublicKey(new Uint8Array(32).fill(8));
    const room = createRoom({
      playerKeys: [left, right, ...Array.from({ length: 10 }, () => EMPTY_KEY)],
      playerStatuses: [PLAYER_STATUS.Revealed, PLAYER_STATUS.Revealed, ...Array.from({ length: 10 }, () => 0)] as FaultlineRoomAccount["playerStatuses"],
      playerZones: [0, 1, ...Array.from({ length: 10 }, () => 0)],
      playerRisks: [0, 1, ...Array.from({ length: 10 }, () => 0)],
      playerForecasts: [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], ...Array.from({ length: 10 }, () => [0, 0, 0, 0, 0] as [number, number, number, number, number])],
      playerErrors: [0, 2, ...Array.from({ length: 10 }, () => 0)],
      playerScoresBps: [200000, 155000, ...Array.from({ length: 10 }, () => 0)],
      playerRewardsLamports: [100_000_000n, 56_800_000n, ...Array.from({ length: 10 }, () => 0n)]
    });

    const round = summarizeResolvedRound(room);

    expect(round?.winnerWallets[0]).toBe(left.toBase58());
    expect(round?.lines[0]).toMatchObject({ finish: 1, rewardLamports: "100000000" });
    expect(round?.lines[1]).toMatchObject({ finish: 2, error: 2 });
  });

  it("updates persistent player profiles and ranks them", () => {
    const wallet = new PublicKey(new Uint8Array(32).fill(7)).toBase58();
    const rival = new PublicKey(new Uint8Array(32).fill(8)).toBase58();
    const round = {
      id: "round-1",
      room: new PublicKey(new Uint8Array(32).fill(9)).toBase58(),
      presetId: 0,
      status: ROOM_STATUS.Resolved,
      createdSlot: "100",
      resolveSlot: "260",
      stakeLamports: "80000000",
      totalStakedLamports: "160000000",
      distributableLamports: "156800000",
      reserveFeeLamports: "3200000",
      playerCount: 2,
      committedCount: 2,
      revealedCount: 2,
      finalHistogram: [1, 1, 0, 0, 0] as [number, number, number, number, number],
      winnerWallets: [wallet],
      lines: [
        { wallet, status: PLAYER_STATUS.Revealed, finish: 1, zone: 0, riskBand: 0, rewardLamports: "100000000", claimed: false, error: 0, scoreBps: 200000 },
        { wallet: rival, status: PLAYER_STATUS.Revealed, finish: 2, zone: 1, riskBand: 1, rewardLamports: "56800000", claimed: false, error: 2, scoreBps: 155000 }
      ]
    };

    const walletProfile = applyRoundToPersistentProfile(createEmptyPersistentPlayerProfile(wallet), round);
    const rivalProfile = applyRoundToPersistentProfile(createEmptyPersistentPlayerProfile(rival), round);
    const leaderboard = buildPersistentLeaderboard([walletProfile, rivalProfile]);

    expect(walletProfile.roundsWon).toBe(1);
    expect(walletProfile.averageError).toBe(0);
    expect(leaderboard[0]?.wallet).toBe(wallet);
    expect(leaderboard[0]?.score).toBeGreaterThan(leaderboard[1]?.score ?? 0);
  });

  it("builds and parses replay slugs deterministically", () => {
    const slug = buildRoundReplaySlug({ room: new PublicKey(new Uint8Array(32).fill(9)).toBase58(), createdSlot: "260" });

    expect(parseRoundReplaySlug(slug)).toEqual({ room: new PublicKey(new Uint8Array(32).fill(9)).toBase58(), createdSlot: "260" });
    expect(parseRoundReplaySlug("broken-slug")).toBeNull();
  });
});
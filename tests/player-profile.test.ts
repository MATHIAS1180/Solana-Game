import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import { buildPlayerBoardSnapshot } from "@/lib/faultline/player-profile";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";

const EMPTY_KEY = new PublicKey(new Uint8Array(32));

function createRoom(overrides: Partial<FaultlineRoomAccount>): FaultlineRoomAccount {
  return {
    publicKey: new PublicKey(new Uint8Array(32).fill(9)),
    version: 1,
    roomBump: 0,
    vaultBump: 0,
    status: ROOM_STATUS.Open,
    zoneCount: 5,
    minPlayers: 2,
    maxPlayers: 12,
    playerCount: 0,
    committedCount: 0,
    revealedCount: 0,
    activeCount: 0,
    winnerCount: 3,
    presetId: 0,
    flags: 0,
    stakeLamports: 10_000_000n,
    totalStakedLamports: 0n,
    distributableLamports: 0n,
    reserveFeeLamports: 0n,
    slashedToReserveLamports: 0n,
    createdSlot: 100n,
    joinDeadlineSlot: 160n,
    joinDurationSlots: 60n,
    commitDurationSlots: 40n,
    commitDeadlineSlot: 0n,
    revealDurationSlots: 40n,
    revealDeadlineSlot: 0n,
    resolveSlot: 0n,
    creator: EMPTY_KEY,
    vault: EMPTY_KEY,
    reserve: EMPTY_KEY,
    treasury: EMPTY_KEY,
    roomSeed: new Uint8Array(32),
    finalHistogram: [0, 0, 0, 0, 0],
    winnerIndices: [255, 255, 255, 255],
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

describe("player board snapshot", () => {
  it("aggregates live exposure and settled payouts for one wallet", () => {
    const trackedWallet = new PublicKey(new Uint8Array(32).fill(7));

    const liveRoom = createRoom({
      publicKey: new PublicKey(new Uint8Array(32).fill(10)),
      status: ROOM_STATUS.Reveal,
      playerCount: 1,
      committedCount: 1,
      revealedCount: 0,
      stakeLamports: 80_000_000n,
      playerKeys: [trackedWallet, ...Array.from({ length: 11 }, () => EMPTY_KEY)],
      playerStatuses: [PLAYER_STATUS.Committed, ...Array.from({ length: 11 }, () => 0)] as FaultlineRoomAccount["playerStatuses"]
    });

    const settledRoom = createRoom({
      publicKey: new PublicKey(new Uint8Array(32).fill(11)),
      status: ROOM_STATUS.Resolved,
      playerCount: 1,
      revealedCount: 1,
      stakeLamports: 160_000_000n,
      resolveSlot: 240n,
      playerKeys: [trackedWallet, ...Array.from({ length: 11 }, () => EMPTY_KEY)],
      playerStatuses: [PLAYER_STATUS.Revealed, ...Array.from({ length: 11 }, () => 0)] as FaultlineRoomAccount["playerStatuses"],
      playerZones: [2, ...Array.from({ length: 11 }, () => 0)],
      playerRisks: [1, ...Array.from({ length: 11 }, () => 0)],
      playerErrors: [4, ...Array.from({ length: 11 }, () => 0)],
      playerScoresBps: [155000, ...Array.from({ length: 11 }, () => 0)],
      playerRewardsLamports: [120_000_000n, ...Array.from({ length: 11 }, () => 0n)]
    });

    const snapshot = buildPlayerBoardSnapshot([liveRoom, settledRoom], trackedWallet.toBase58(), 200);

    expect(snapshot.activeSeats).toBe(1);
    expect(snapshot.committedSeats).toBe(1);
    expect(snapshot.revealedSeats).toBe(1);
    expect(snapshot.wins).toBe(1);
    expect(snapshot.livePressureLamports).toBe(80_000_000n);
    expect(snapshot.totalPayoutLamports).toBe(120_000_000n);
    expect(snapshot.averageError).toBe(4);
    expect(snapshot.activeLines[0]?.roomAddress).toBe(liveRoom.publicKey.toBase58());
    expect(snapshot.settledLines[0]?.roomAddress).toBe(settledRoom.publicKey.toBase58());
  });
});
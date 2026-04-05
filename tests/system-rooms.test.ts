import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { ROOM_STATUS } from "@/lib/faultline/constants";
import { selectVisibleSystemRooms } from "@/lib/faultline/system-rooms";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";

function createRoom(overrides: Partial<FaultlineRoomAccount>): FaultlineRoomAccount {
  return {
    publicKey: Keypair.generate().publicKey,
    version: 1,
    roomBump: 1,
    vaultBump: 1,
    status: ROOM_STATUS.Open,
    zoneCount: 5,
    minPlayers: 2,
    maxPlayers: 12,
    playerCount: 0,
    committedCount: 0,
    revealedCount: 0,
    activeCount: 0,
    winnerCount: 4,
    presetId: 0,
    flags: 0,
    stakeLamports: 10_000_000n,
    totalStakedLamports: 0n,
    distributableLamports: 0n,
    reserveFeeLamports: 0n,
    slashedToReserveLamports: 0n,
    createdSlot: 100n,
    joinDeadlineSlot: 200n,
    joinDurationSlots: 220n,
    commitDurationSlots: 160n,
    commitDeadlineSlot: 0n,
    revealDurationSlots: 160n,
    revealDeadlineSlot: 0n,
    resolveSlot: 0n,
    creator: Keypair.generate().publicKey,
    vault: Keypair.generate().publicKey,
    reserve: Keypair.generate().publicKey,
    treasury: Keypair.generate().publicKey,
    roomSeed: new Uint8Array(32),
    finalHistogram: [0, 0, 0, 0, 0],
    winnerIndices: [255, 255, 255, 255],
    payoutBps: [7000, 2000, 1000, 0],
    playerKeys: Array.from({ length: 12 }, () => Keypair.generate().publicKey),
    playerStatuses: Array.from({ length: 12 }, () => 0),
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

describe("selectVisibleSystemRooms", () => {
  it("retient une room expirée sous le minimum pour permettre son annulation", () => {
    const room = createRoom({ joinDeadlineSlot: 120n, playerCount: 1 });

    const visibleRooms = selectVisibleSystemRooms(150, [room]);

    expect(visibleRooms).toHaveLength(1);
    expect(visibleRooms[0].publicKey.equals(room.publicKey)).toBe(true);
  });

  it("ignore une room resolue et laisse le preset redevenir disponible", () => {
    const room = createRoom({ status: ROOM_STATUS.Resolved, playerCount: 3 });

    const visibleRooms = selectVisibleSystemRooms(150, [room]);

    expect(visibleRooms).toHaveLength(0);
  });

  it("prefere une room joinable recente pour un preset", () => {
    const olderRoom = createRoom({ createdSlot: 100n, playerCount: 2 });
    const newerRoom = createRoom({ createdSlot: 150n, playerCount: 1 });

    const visibleRooms = selectVisibleSystemRooms(120, [olderRoom, newerRoom]);

    expect(visibleRooms).toHaveLength(1);
    expect(visibleRooms[0].publicKey.equals(newerRoom.publicKey)).toBe(true);
  });

  it("garde une room idle persistante visible et joinable", () => {
    const room = createRoom({ playerCount: 0, joinDeadlineSlot: 0n });

    const visibleRooms = selectVisibleSystemRooms(150, [room]);

    expect(visibleRooms).toHaveLength(1);
    expect(visibleRooms[0].publicKey.equals(room.publicKey)).toBe(true);
  });
});
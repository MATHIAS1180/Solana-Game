import "server-only";

import { PublicKey } from "@solana/web3.js";

import { DEFAULT_ROOM_PRESETS, ROOM_STATUS, matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import { getPersistentRoundIdFromParts, parseRoundReplaySlug, summarizeResolvedRound } from "@/lib/faultline/metagame";
import { getPersistentLeaderboard, getPersistentPlayerProfile, getPersistentRound, getRecentPersistentRounds, syncMetagameFromRooms } from "@/lib/faultline/metagame-store";
import { buildPlayerBoardSnapshot } from "@/lib/faultline/player-profile";
import { deriveRoomPda } from "@/lib/faultline/pdas";
import { fetchReserve, fetchRoom, fetchRooms } from "@/lib/faultline/rooms";
import { selectVisibleSystemRooms } from "@/lib/faultline/system-rooms";
import { deserializeRoomAccount, serializeReserveAccount, serializeRoomAccount } from "@/lib/faultline/transport";
import { getServerConnection, getServerProgramId } from "@/lib/solana/server";

let lastVisibleRoomsSnapshot: Awaited<ReturnType<typeof buildVisibleRoomsSnapshot>> | null = null;

const lastRoomSnapshots = new Map<string, Awaited<ReturnType<typeof buildRoomSnapshot>> | null>();
const lastPlayerSnapshots = new Map<string, Awaited<ReturnType<typeof buildPlayerSnapshot>>>();
let lastReserveSnapshot: Awaited<ReturnType<typeof buildReserveSnapshot>> | null = null;

async function buildVisibleRoomsSnapshot() {
  const connection = getServerConnection();
  const programId = getServerProgramId();
  const [rooms, currentSlot] = await Promise.all([fetchRooms(connection, programId), connection.getSlot("confirmed")]);
  const systemRooms = rooms.filter((room) => matchesDefaultRoomPreset(room));
  const visibleRooms = selectVisibleSystemRooms(currentSlot, systemRooms);

  await syncMetagameFromRooms(systemRooms).catch(() => {
    // Metagame persistence should not break room snapshots.
  });

  return {
    currentSlot,
    rooms: visibleRooms.sort((left, right) => Number(left.stakeLamports - right.stakeLamports)).map(serializeRoomAccount)
  };
}

async function findPresetIdForRoomAddress(roomAddress: string) {
  const programId = getServerProgramId();

  for (const preset of DEFAULT_ROOM_PRESETS) {
    const [roomPda] = await deriveRoomPda(programId, preset.id);
    if (roomPda.toBase58() === roomAddress) {
      return preset.id;
    }
  }

  return null;
}

async function buildRoomSnapshot(roomAddress: string) {
  const connection = getServerConnection();
  const roomKey = new PublicKey(roomAddress);
  const [roomAccount, currentSlot, presetId] = await Promise.all([
    fetchRoom(connection, roomKey),
    connection.getSlot("confirmed"),
    findPresetIdForRoomAddress(roomAddress)
  ]);

  if (!roomAccount) {
    if (presetId === null) {
      return null;
    }

    return {
      currentSlot,
      room: null,
      presetId
    };
  }

  if (matchesDefaultRoomPreset(roomAccount)) {
    await syncMetagameFromRooms([roomAccount]).catch(() => {
      // Best-effort persistence for resolved rounds.
    });
  }

  return {
    currentSlot,
    room: serializeRoomAccount(roomAccount),
    presetId: roomAccount.presetId
  };
}

async function buildPlayerSnapshot(wallet: string) {
  const connection = getServerConnection();
  const programId = getServerProgramId();
  const [rooms, currentSlot] = await Promise.all([fetchRooms(connection, programId), connection.getSlot("confirmed")]);
  const systemRooms = rooms.filter((room) => matchesDefaultRoomPreset(room));

  await syncMetagameFromRooms(systemRooms).catch(() => {
    // Ignore persistence issues and keep the live board available.
  });

  return buildPlayerBoardSnapshot(
    systemRooms,
    wallet,
    currentSlot
  );
}

async function buildReserveSnapshot() {
  const connection = getServerConnection();
  const programId = getServerProgramId();
  const [reserve, currentSlot] = await Promise.all([fetchReserve(connection, programId), connection.getSlot("confirmed")]);

  return {
    currentSlot,
    reserve: reserve ? serializeReserveAccount(reserve) : null
  };
}

export async function getPersistentMetagameSnapshot(limit = 12) {
  const [leaderboard, recentRounds] = await Promise.all([getPersistentLeaderboard(limit), getRecentPersistentRounds(limit)]);

  return {
    leaderboard,
    recentRounds
  };
}

export async function getPersistentPlayerDossier(wallet: string) {
  const [board, profile] = await Promise.all([getPlayerSnapshot(wallet), getPersistentPlayerProfile(wallet)]);

  return {
    board,
    profile
  };
}

export async function getReserveSnapshot() {
  try {
    const snapshot = await buildReserveSnapshot();
    lastReserveSnapshot = snapshot;
    return snapshot;
  } catch (error) {
    if (lastReserveSnapshot) {
      return lastReserveSnapshot;
    }

    throw error;
  }
}

export async function getPersistentRoundReplay(slug: string) {
  const parsed = parseRoundReplaySlug(slug);
  if (!parsed) {
    return null;
  }

  const stored = await getPersistentRound(getPersistentRoundIdFromParts(parsed.room, parsed.createdSlot));
  if (stored) {
    return stored;
  }

  const roomSnapshot = await getRoomSnapshot(parsed.room);
  if (!roomSnapshot?.room) {
    return null;
  }

  const room = deserializeRoomAccount(roomSnapshot.room);
  if (room.status !== ROOM_STATUS.Resolved || room.createdSlot.toString() !== parsed.createdSlot) {
    return null;
  }

  return summarizeResolvedRound(room);
}

export async function getVisibleRoomsSnapshot() {
  try {
    const snapshot = await buildVisibleRoomsSnapshot();
    lastVisibleRoomsSnapshot = snapshot;
    return snapshot;
  } catch (error) {
    if (lastVisibleRoomsSnapshot) {
      return lastVisibleRoomsSnapshot;
    }

    throw error;
  }
}

export async function getRoomSnapshot(roomAddress: string) {
  try {
    const snapshot = await buildRoomSnapshot(roomAddress);
    lastRoomSnapshots.set(roomAddress, snapshot);
    return snapshot;
  } catch (error) {
    if (lastRoomSnapshots.has(roomAddress)) {
      return lastRoomSnapshots.get(roomAddress) ?? null;
    }

    throw error;
  }
}

export async function getPlayerSnapshot(wallet: string) {
  try {
    const snapshot = await buildPlayerSnapshot(wallet);
    lastPlayerSnapshots.set(wallet, snapshot);
    return snapshot;
  } catch (error) {
    if (lastPlayerSnapshots.has(wallet)) {
      return lastPlayerSnapshots.get(wallet)!;
    }

    throw error;
  }
}
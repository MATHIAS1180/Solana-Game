import "server-only";

import { PublicKey } from "@solana/web3.js";

import { matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import { fetchRoom, fetchRooms } from "@/lib/faultline/rooms";
import { selectVisibleSystemRooms } from "@/lib/faultline/system-rooms";
import { serializeRoomAccount } from "@/lib/faultline/transport";
import { getServerConnection, getServerProgramId } from "@/lib/solana/server";

const SNAPSHOT_TTL_MS = 10_000;

let visibleRoomsCache:
  | {
      fetchedAt: number;
      snapshot: Awaited<ReturnType<typeof buildVisibleRoomsSnapshot>>;
    }
  | null = null;

const roomSnapshotCache = new Map<
  string,
  {
    fetchedAt: number;
    snapshot: Awaited<ReturnType<typeof buildRoomSnapshot>> | null;
  }
>();

function isFresh(fetchedAt: number) {
  return Date.now() - fetchedAt <= SNAPSHOT_TTL_MS;
}

async function buildVisibleRoomsSnapshot() {
  const connection = getServerConnection();
  const programId = getServerProgramId();
  const [rooms, currentSlot] = await Promise.all([fetchRooms(connection, programId), connection.getSlot("confirmed")]);
  const visibleRooms = selectVisibleSystemRooms(currentSlot, rooms.filter((room) => matchesDefaultRoomPreset(room)));

  return {
    currentSlot,
    rooms: visibleRooms.sort((left, right) => Number(left.stakeLamports - right.stakeLamports)).map(serializeRoomAccount)
  };
}

async function buildRoomSnapshot(roomAddress: string) {
  const connection = getServerConnection();
  const roomKey = new PublicKey(roomAddress);
  const [roomAccount, currentSlot] = await Promise.all([fetchRoom(connection, roomKey), connection.getSlot("confirmed")]);

  if (!roomAccount) {
    return null;
  }

  return {
    currentSlot,
    room: serializeRoomAccount(roomAccount)
  };
}

export async function getVisibleRoomsSnapshot() {
  if (visibleRoomsCache && isFresh(visibleRoomsCache.fetchedAt)) {
    return visibleRoomsCache.snapshot;
  }

  try {
    const snapshot = await buildVisibleRoomsSnapshot();
    visibleRoomsCache = { fetchedAt: Date.now(), snapshot };
    return snapshot;
  } catch (error) {
    if (visibleRoomsCache) {
      return visibleRoomsCache.snapshot;
    }

    throw error;
  }
}

export async function getRoomSnapshot(roomAddress: string) {
  const cached = roomSnapshotCache.get(roomAddress);
  if (cached && isFresh(cached.fetchedAt)) {
    return cached.snapshot;
  }

  try {
    const snapshot = await buildRoomSnapshot(roomAddress);
    roomSnapshotCache.set(roomAddress, { fetchedAt: Date.now(), snapshot });
    return snapshot;
  } catch (error) {
    if (cached) {
      return cached.snapshot;
    }

    throw error;
  }
}
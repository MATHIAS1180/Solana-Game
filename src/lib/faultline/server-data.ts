import "server-only";

import { PublicKey } from "@solana/web3.js";

import { DEFAULT_ROOM_PRESETS, matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import { deriveRoomPda } from "@/lib/faultline/pdas";
import { fetchRoom, fetchRooms } from "@/lib/faultline/rooms";
import { selectVisibleSystemRooms } from "@/lib/faultline/system-rooms";
import { serializeRoomAccount } from "@/lib/faultline/transport";
import { getServerConnection, getServerProgramId } from "@/lib/solana/server";

let lastVisibleRoomsSnapshot: Awaited<ReturnType<typeof buildVisibleRoomsSnapshot>> | null = null;

const lastRoomSnapshots = new Map<string, Awaited<ReturnType<typeof buildRoomSnapshot>> | null>();

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

  return {
    currentSlot,
    room: serializeRoomAccount(roomAccount),
    presetId: roomAccount.presetId
  };
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
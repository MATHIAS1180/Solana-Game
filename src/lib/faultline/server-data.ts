import "server-only";

import { PublicKey } from "@solana/web3.js";

import { DEFAULT_ROOM_PRESETS, ROOM_STATUS, matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import { fetchRoom, fetchRooms } from "@/lib/faultline/rooms";
import { serializeRoomAccount } from "@/lib/faultline/transport";
import { getServerConnection, getServerProgramId } from "@/lib/solana/server";

function selectVisibleRooms(currentSlot: number, rooms: Awaited<ReturnType<typeof fetchRooms>>) {
  return DEFAULT_ROOM_PRESETS
    .map((preset) => {
      const candidates = rooms.filter((room) => room.presetId === preset.id && matchesDefaultRoomPreset(room));
      if (candidates.length === 0) {
        return null;
      }

      const visibleCandidates = candidates.filter(
        (room) => !(room.status === ROOM_STATUS.Open && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers)
      );
      if (visibleCandidates.length === 0) {
        return null;
      }

      const joinable = visibleCandidates
        .filter((room) => room.status === ROOM_STATUS.Open && currentSlot <= Number(room.joinDeadlineSlot) && room.playerCount < room.maxPlayers)
        .sort((left, right) => Number(right.createdSlot - left.createdSlot));

      if (joinable.length > 0) {
        return joinable[0];
      }

      return visibleCandidates.sort((left, right) => Number(right.createdSlot - left.createdSlot))[0];
    })
    .filter((room): room is NonNullable<typeof room> => room !== null);
}

export async function getVisibleRoomsSnapshot() {
  const connection = getServerConnection();
  const programId = getServerProgramId();
  const [rooms, currentSlot] = await Promise.all([fetchRooms(connection, programId), connection.getSlot("confirmed")]);
  const visibleRooms = selectVisibleRooms(currentSlot, rooms);

  return {
    currentSlot,
    rooms: visibleRooms.sort((left, right) => Number(left.stakeLamports - right.stakeLamports)).map(serializeRoomAccount)
  };
}

export async function getRoomSnapshot(roomAddress: string) {
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
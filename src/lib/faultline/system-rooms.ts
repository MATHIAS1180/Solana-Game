import { DEFAULT_ROOM_PRESETS, ROOM_STATUS, matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import type { FaultlineRoomAccount, RoomPreset } from "@/lib/faultline/types";

export function findSystemPresetById(presetId: number): RoomPreset | null {
  return DEFAULT_ROOM_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function isPendingCancellationRoom(room: FaultlineRoomAccount, currentSlot: number) {
  return room.status === ROOM_STATUS.Open && room.playerCount > 0 && Number(room.joinDeadlineSlot) > 0 && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers;
}

export function isSettledSystemRoom(room: FaultlineRoomAccount) {
  return (
    room.status === ROOM_STATUS.Resolved ||
    room.status === ROOM_STATUS.Cancelled ||
    room.status === ROOM_STATUS.Emergency ||
    room.status === ROOM_STATUS.Closed
  );
}

export function isJoinableSystemRoom(room: FaultlineRoomAccount, currentSlot: number) {
  return (
    matchesDefaultRoomPreset(room) &&
    room.status === ROOM_STATUS.Open &&
    (room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 || currentSlot <= Number(room.joinDeadlineSlot)) &&
    room.playerCount < room.maxPlayers
  );
}

export function findJoinableSystemRoom(rooms: FaultlineRoomAccount[], presetId: number, currentSlot: number) {
  return (
    rooms
      .filter((room) => room.presetId === presetId && isJoinableSystemRoom(room, currentSlot))
      .sort((left, right) => Number(right.createdSlot - left.createdSlot))[0] ?? null
  );
}

export function findVisibleSystemRoom(rooms: FaultlineRoomAccount[], presetId: number, currentSlot: number) {
  const candidates = rooms
    .filter((room) => room.presetId === presetId && matchesDefaultRoomPreset(room))
    .sort((left, right) => Number(right.createdSlot - left.createdSlot));

  if (candidates.length === 0) {
    return null;
  }

  return (
    candidates.find((room) => isJoinableSystemRoom(room, currentSlot)) ??
    candidates.find((room) => isPendingCancellationRoom(room, currentSlot)) ??
    candidates.find((room) => !isSettledSystemRoom(room) && !isPendingCancellationRoom(room, currentSlot)) ??
    null
  );
}

export function selectVisibleSystemRooms(currentSlot: number, rooms: FaultlineRoomAccount[]) {
  return DEFAULT_ROOM_PRESETS
    .map((preset) => findVisibleSystemRoom(rooms, preset.id, currentSlot))
    .filter((room): room is NonNullable<typeof room> => room !== null);
}
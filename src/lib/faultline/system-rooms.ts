import { DEFAULT_ROOM_PRESETS, ROOM_STATUS, matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import type { FaultlineRoomAccount, RoomPreset } from "@/lib/faultline/types";

export function findSystemPresetById(presetId: number): RoomPreset | null {
  return DEFAULT_ROOM_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function isPendingCancellationRoom(room: FaultlineRoomAccount, currentSlot: number) {
  return room.status === ROOM_STATUS.Open && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers;
}

export function isJoinableSystemRoom(room: FaultlineRoomAccount, currentSlot: number) {
  return (
    matchesDefaultRoomPreset(room) &&
    room.status === ROOM_STATUS.Open &&
    currentSlot <= Number(room.joinDeadlineSlot) &&
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

export function selectVisibleSystemRooms(currentSlot: number, rooms: FaultlineRoomAccount[]) {
  return DEFAULT_ROOM_PRESETS
    .map((preset) => {
      const candidates = rooms.filter((room) => room.presetId === preset.id && matchesDefaultRoomPreset(room));
      if (candidates.length === 0) {
        return null;
      }

      const visibleCandidates = candidates.filter((room) => !isPendingCancellationRoom(room, currentSlot));
      if (visibleCandidates.length === 0) {
        return null;
      }

      return (
        findJoinableSystemRoom(visibleCandidates, preset.id, currentSlot) ??
        visibleCandidates.sort((left, right) => Number(right.createdSlot - left.createdSlot))[0]
      );
    })
    .filter((room): room is NonNullable<typeof room> => room !== null);
}
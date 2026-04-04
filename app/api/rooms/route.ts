import { NextResponse } from "next/server";

import { DEFAULT_ROOM_PRESETS, ROOM_STATUS, matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import { fetchRooms } from "@/lib/faultline/rooms";
import { serializeRoomAccount } from "@/lib/faultline/transport";
import { getServerConnection, getServerProgramId } from "@/lib/solana/server";

function selectVisibleRooms(currentSlot: number, rooms: Awaited<ReturnType<typeof fetchRooms>>) {
  return DEFAULT_ROOM_PRESETS.map((preset) => {
    const candidates = rooms.filter((room) => room.presetId === preset.id && matchesDefaultRoomPreset(room));
    if (candidates.length === 0) {
      return null;
    }

    const joinable = candidates
      .filter((room) => room.status === ROOM_STATUS.Open && currentSlot <= Number(room.joinDeadlineSlot) && room.playerCount < room.maxPlayers)
      .sort((left, right) => Number(right.createdSlot - left.createdSlot));

    if (joinable.length > 0) {
      return joinable[0];
    }

    return candidates.sort((left, right) => Number(right.createdSlot - left.createdSlot))[0];
  }).filter((room): room is NonNullable<typeof room> => room !== null);
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connection = getServerConnection();
    const programId = getServerProgramId();
    const [rooms, currentSlot] = await Promise.all([fetchRooms(connection, programId), connection.getSlot("confirmed")]);
    const visibleRooms = selectVisibleRooms(currentSlot, rooms);

    return NextResponse.json({
      ok: true,
      currentSlot,
      rooms: visibleRooms.sort((left, right) => Number(left.stakeLamports - right.stakeLamports)).map(serializeRoomAccount)
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
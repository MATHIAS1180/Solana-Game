import { NextResponse } from "next/server";

import { matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import { fetchRooms } from "@/lib/faultline/rooms";
import { serializeRoomAccount } from "@/lib/faultline/transport";
import { getServerConnection, getServerProgramId } from "@/lib/solana/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connection = getServerConnection();
    const programId = getServerProgramId();
    const [rooms, currentSlot] = await Promise.all([fetchRooms(connection, programId), connection.getSlot("confirmed")]);

    return NextResponse.json({
      ok: true,
      currentSlot,
      rooms: rooms.filter((room) => matchesDefaultRoomPreset(room)).sort((left, right) => Number(left.stakeLamports - right.stakeLamports)).map(serializeRoomAccount)
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
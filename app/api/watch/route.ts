import { NextResponse } from "next/server";

import { deserializeRoomAccount } from "@/lib/faultline/transport";
import { getPersistentMetagameSnapshot, getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";
import { getProtocolManifest } from "@/lib/faultline/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [live, metagame] = await Promise.all([getVisibleRoomsSnapshot(), getPersistentMetagameSnapshot(8)]);

    return NextResponse.json({
      ok: true,
      currentSlot: live.currentSlot,
      rooms: live.rooms,
      liveRooms: live.rooms.map(deserializeRoomAccount).filter((room) => room.playerCount > 0 && room.status < 3).map((room) => room.publicKey.toBase58()),
      leaderboard: metagame.leaderboard,
      recentRounds: metagame.recentRounds,
      protocol: getProtocolManifest()
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
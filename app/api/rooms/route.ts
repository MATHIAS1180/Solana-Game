import { NextResponse } from "next/server";

import { getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getVisibleRoomsSnapshot();

    return NextResponse.json({
      ok: true,
      currentSlot: snapshot.currentSlot,
      rooms: snapshot.rooms
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
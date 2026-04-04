import { NextResponse } from "next/server";

import { getRoomSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ room: string }> }) {
  try {
    const { room } = await context.params;
    const snapshot = await getRoomSnapshot(room);

    if (!snapshot) {
      return NextResponse.json({ ok: false, error: "Room introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, currentSlot: snapshot.currentSlot, room: snapshot.room });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
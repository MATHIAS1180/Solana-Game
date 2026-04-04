import { NextResponse } from "next/server";

import { PublicKey } from "@solana/web3.js";

import { fetchRoom } from "@/lib/faultline/rooms";
import { serializeRoomAccount } from "@/lib/faultline/transport";
import { getServerConnection } from "@/lib/solana/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ room: string }> }) {
  try {
    const { room } = await context.params;
    const connection = getServerConnection();
    const roomKey = new PublicKey(room);
    const [roomAccount, currentSlot] = await Promise.all([fetchRoom(connection, roomKey), connection.getSlot("confirmed")]);

    if (!roomAccount) {
      return NextResponse.json({ ok: false, error: "Room introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, currentSlot, room: serializeRoomAccount(roomAccount) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
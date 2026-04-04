import { NextResponse } from "next/server";

import { ensureSystemRoomForPreset } from "@/lib/faultline/automation";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ preset: string }> }) {
  try {
    const { preset } = await context.params;
    const presetId = Number(preset);
    if (!Number.isInteger(presetId) || presetId < 0) {
      return NextResponse.json({ ok: false, error: "Preset invalide." }, { status: 400 });
    }

    const room = await ensureSystemRoomForPreset(presetId);
    return NextResponse.json({ ok: true, roomAddress: room.publicKey.toBase58() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
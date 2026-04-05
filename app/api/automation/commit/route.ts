import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { buildCommitHash, parseStoredCommitPayload, toHex } from "@/lib/faultline/commit";
import { deleteAutomationCommitPayload, hasAutomationCommitPayload, isAutomationStorageConfigured, storeAutomationCommitPayload } from "@/lib/faultline/automation-store";
import type { StoredCommitPayload } from "@/lib/faultline/types";

export const dynamic = "force-dynamic";
const RECOVERY_TTL_DAYS = 7;

function toStoredPayload(body: unknown): StoredCommitPayload {
  return parseStoredCommitPayload(body);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room");
  const player = searchParams.get("player");
  const configured = isAutomationStorageConfigured();

  if (!room || !player) {
    return NextResponse.json({ ok: true, configured, mirrored: false, ttlDays: RECOVERY_TTL_DAYS });
  }

  try {
    new PublicKey(room);
    new PublicKey(player);
  } catch {
    return NextResponse.json({ ok: false, error: "room and player must be valid public keys." }, { status: 400 });
  }

  const mirrored = configured ? await hasAutomationCommitPayload(room, player) : false;
  return NextResponse.json({ ok: true, configured, mirrored, ttlDays: RECOVERY_TTL_DAYS });
}

export async function POST(request: Request) {
  if (!isAutomationStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "Automation storage is not configured." }, { status: 503 });
  }

  try {
    const record = toStoredPayload(await request.json());
    const expectedHash = buildCommitHash({
      room: new PublicKey(record.room),
      player: new PublicKey(record.player),
      roundId: BigInt(record.roundId),
      zone: record.zone,
      riskBand: record.riskBand,
      forecast: record.forecast,
      nonce: Uint8Array.from(record.nonce)
    }, record.commitVersion);

    if (toHex(expectedHash) !== toHex(Uint8Array.from(record.commitHash))) {
      return NextResponse.json({ ok: false, error: "Payload does not match the provided commitHash." }, { status: 400 });
    }

    await storeAutomationCommitPayload(record);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { room?: string; player?: string };
    if (!body.room || !body.player) {
      return NextResponse.json({ ok: false, error: "room and player are required." }, { status: 400 });
    }

    await deleteAutomationCommitPayload(body.room, body.player);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { buildCommitHash, toHex } from "@/lib/faultline/commit";
import { deleteAutomationCommitPayload, isAutomationStorageConfigured, storeAutomationCommitPayload } from "@/lib/faultline/automation-store";
import type { StoredCommitPayload } from "@/lib/faultline/types";

export const dynamic = "force-dynamic";

function toStoredPayload(body: unknown): StoredCommitPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid JSON payload.");
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.room !== "string" || typeof candidate.player !== "string") {
    throw new Error("room and player are required.");
  }
  if (typeof candidate.zone !== "number" || typeof candidate.riskBand !== "number") {
    throw new Error("zone and riskBand are required.");
  }
  if (!Array.isArray(candidate.forecast) || candidate.forecast.length !== 5) {
    throw new Error("forecast must contain exactly 5 values.");
  }
  if (!Array.isArray(candidate.nonce) || candidate.nonce.length !== 32) {
    throw new Error("nonce must contain exactly 32 values.");
  }
  if (!Array.isArray(candidate.commitHash) || candidate.commitHash.length !== 32) {
    throw new Error("commitHash must contain exactly 32 values.");
  }

  return {
    room: candidate.room,
    player: candidate.player,
    zone: candidate.zone as StoredCommitPayload["zone"],
    riskBand: candidate.riskBand as StoredCommitPayload["riskBand"],
    forecast: candidate.forecast.map((value) => Number(value)) as StoredCommitPayload["forecast"],
    nonce: candidate.nonce.map((value) => Number(value)),
    commitHash: candidate.commitHash.map((value) => Number(value)),
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now()
  };
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
      zone: record.zone,
      riskBand: record.riskBand,
      forecast: record.forecast,
      nonce: Uint8Array.from(record.nonce)
    });

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
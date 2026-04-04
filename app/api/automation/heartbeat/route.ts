import { NextResponse } from "next/server";

import { runAutomationHeartbeat } from "@/lib/faultline/automation";

export const dynamic = "force-dynamic";

async function handle() {
  try {
    const summary = await runAutomationHeartbeat();
    return NextResponse.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}
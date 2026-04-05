import { NextResponse } from "next/server";

import { getReserveSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getReserveSnapshot();
    return NextResponse.json({ ok: true, ...snapshot });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
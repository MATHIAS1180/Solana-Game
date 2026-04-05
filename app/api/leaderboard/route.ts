import { NextResponse } from "next/server";

import { getPersistentMetagameSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getPersistentMetagameSnapshot();

    return NextResponse.json({
      ok: true,
      leaderboard: snapshot.leaderboard,
      recentRounds: snapshot.recentRounds
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
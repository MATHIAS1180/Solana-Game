import { NextResponse } from "next/server";

import { buildLeaderboardFromRounds, filterRounds, parseLeaderboardPeriod, parseLeaderboardSort, parseStakeFilter } from "@/lib/faultline/analytics";
import { getAllPersistentRounds } from "@/lib/faultline/metagame-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = parseLeaderboardPeriod(searchParams.get("period"));
    const sort = parseLeaderboardSort(searchParams.get("sort"));
    const stakeLamports = parseStakeFilter(searchParams.get("stake"));
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 100);
    const allRounds = await getAllPersistentRounds();
    const rounds = filterRounds(allRounds, { period, stakeLamports });
    const leaderboard = buildLeaderboardFromRounds(rounds, sort).slice(0, limit);
    const totalVolumeLamports = rounds.reduce((sum, round) => sum + BigInt(round.totalStakedLamports), 0n);

    return NextResponse.json({
      ok: true,
      filters: {
        period,
        sort,
        stake: stakeLamports?.toString() ?? null,
        limit
      },
      summary: {
        totalRounds: rounds.length,
        rankedWallets: leaderboard.length,
        totalVolumeLamports: totalVolumeLamports.toString()
      },
      leaderboard,
      recentRounds: rounds.slice(0, Math.min(limit, 12))
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
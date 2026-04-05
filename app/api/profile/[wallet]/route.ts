import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { buildPlayerAnalytics } from "@/lib/faultline/analytics";
import { getAllPersistentRounds } from "@/lib/faultline/metagame-store";
import { getPersistentPlayerDossier, getReserveSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ wallet: string }> }) {
  try {
    const { wallet } = await context.params;
    new PublicKey(wallet);

    const [snapshot, reserve, rounds] = await Promise.all([getPersistentPlayerDossier(wallet), getReserveSnapshot(), getAllPersistentRounds()]);
    const analytics = buildPlayerAnalytics(rounds, wallet);

    return NextResponse.json({
      ok: true,
      wallet,
      board: snapshot.board,
      profile: snapshot.profile,
      analytics,
      reserve: reserve.reserve,
      indexed: snapshot.profile.roundsPlayed > 0 || snapshot.board.activeLines.length > 0 || snapshot.board.settledLines.length > 0
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

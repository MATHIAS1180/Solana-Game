import type { Metadata } from "next";

import { ProgramBanner } from "@/components/game/program-banner";
import { buildReserveDisciplineBoard, getReserveAvailableLamports, getReserveDistributionRate } from "@/lib/faultline/fair-access";
import { getPersistentMetagameSnapshot, getReserveSnapshot } from "@/lib/faultline/server-data";
import { formatLamports, shortKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserve",
  description: "Inspect the Faultline Arena reserve, anti-grief balance, free-access posture, and reserve-facing discipline snapshot.",
  alternates: { canonical: "/reserve" },
  openGraph: {
    title: "Reserve - Faultline Arena",
    description: "Inspect the visible reserve rail, anti-grief balance, and free-access posture.",
    url: "/reserve"
  },
  twitter: {
    card: "summary_large_image",
    title: "Reserve - Faultline Arena",
    description: "Inspect the visible reserve rail, anti-grief balance, and free-access posture."
  }
};

export default async function ReservePage() {
  const [snapshot, metagame] = await Promise.all([getReserveSnapshot(), getPersistentMetagameSnapshot(12)]);
  const reserve = snapshot.reserve;
  const disciplineBoard = buildReserveDisciplineBoard(metagame.leaderboard);
  const recentReserveInflow = metagame.recentRounds.slice(0, 6).reduce((sum, round) => sum + BigInt(round.reserveFeeLamports), 0n);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Reserve Console</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl">The protocol reserve is now visible instead of being implied in copy.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          This is the public read-only view of the reserve PDA backing anti-grief penalties, reveal timeouts, and the eventual free-access loop.
        </p>
      </section>

      {reserve ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="arena-stat rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Collected</p>
              <p className="mt-3 text-3xl text-white">{formatLamports(BigInt(reserve.totalCollectedLamports))}</p>
            </div>
            <div className="arena-stat rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Available now</p>
              <p className="mt-3 text-3xl text-white">{formatLamports(getReserveAvailableLamports(reserve))}</p>
            </div>
            <div className="arena-stat rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Anti-grief</p>
              <p className="mt-3 text-3xl text-white">{formatLamports(BigInt(reserve.antiGriefCollectedLamports))}</p>
            </div>
            <div className="arena-stat rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Recent reserve inflow</p>
              <p className="mt-3 text-3xl text-white">{formatLamports(recentReserveInflow)}</p>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
            <div className="fault-card rounded-[2rem] p-6 sm:p-8">
              <p className="arena-kicker">Free Access State</p>
              <h2 className="mt-3 font-display text-2xl text-white">The economic rail exists, and the public can now read what it is trying to protect.</h2>
              <div className="mt-6 space-y-3">
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/72">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Feature flag</p>
                  <p className="mt-2 text-white">{reserve.freeAccessEnabled ? "Enabled on-chain" : "Disabled on-chain"}</p>
                </div>
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/72">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Distribution rate</p>
                  <p className="mt-2 text-white">{getReserveDistributionRate(reserve).toFixed(2)}%</p>
                </div>
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/72">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Free access distributed</p>
                  <p className="mt-2 text-white">{formatLamports(BigInt(reserve.freeAccessDistributedLamports))}</p>
                </div>
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
                  The public meaning is now clearer: anti-grief and timeout penalties are accumulating into a visible balance, and future free-access aid should reward disciplined players rather than simply paper over bad behavior.
                </div>
                <a href="/alerts" className="arena-secondary inline-flex px-5 py-3 text-xs uppercase tracking-[0.2em]">
                  Arm reserve alerts
                </a>
              </div>
            </div>

            <div className="fault-card rounded-[2rem] p-6 sm:p-8">
              <p className="arena-kicker">Protocol Details</p>
              <h2 className="mt-3 font-display text-2xl text-white">Reserve PDA facts.</h2>
              <div className="mt-6 space-y-3 text-sm text-white/72">
                <div className="arena-surface rounded-2xl p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Reserve account</p>
                  <p className="mt-2 break-all text-white">{shortKey(reserve.publicKey, 8)}</p>
                </div>
                <div className="arena-surface rounded-2xl p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Authority</p>
                  <p className="mt-2 break-all text-white">{shortKey(reserve.authority, 8)}</p>
                </div>
                <div className="arena-surface rounded-2xl p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Paused</p>
                  <p className="mt-2 text-white">{reserve.paused ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
            <div className="fault-card rounded-[2rem] p-6 sm:p-8">
              <p className="arena-kicker">What Free Access Should Reward</p>
              <h2 className="mt-3 font-display text-2xl text-white">Reserve aid should follow discipline, not noise.</h2>
              <div className="mt-6 space-y-3 text-sm leading-7 text-white/72">
                <div className="arena-surface rounded-2xl p-4">
                  Low timeout behavior matters because the reserve should not subsidize repeated disappearances.
                </div>
                <div className="arena-surface rounded-2xl p-4">
                  Consistent reveal participation matters because the protocol only becomes readable when players actually open the envelopes they sealed.
                </div>
                <div className="arena-surface rounded-2xl p-4">
                  Public player dossiers now expose this posture wallet by wallet, even though the actual claim flow is not open yet.
                </div>
              </div>
            </div>

            <div className="fault-card rounded-[2rem] p-6 sm:p-8">
              <p className="arena-kicker">Discipline Snapshot</p>
              <h2 className="mt-3 font-display text-2xl text-white">Wallets currently reading as the cleanest public actors.</h2>
              <div className="mt-6 space-y-3">
                {disciplineBoard.length > 0 ? (
                  disciplineBoard.map((entry, index) => (
                    <div key={entry.wallet} className="arena-surface rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <a href={`/players/${entry.wallet}`} className="font-display text-lg text-white transition hover:text-fault-flare">
                            #{index + 1} {shortKey(entry.wallet, 6)}
                          </a>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-fault-flare">{entry.roundsPlayed} rounds / {entry.roundsWon} wins</p>
                        </div>
                        <div className="text-right text-sm text-white/72">
                          <p>{entry.timeoutCount} timeout{entry.timeoutCount === 1 ? "" : "s"}</p>
                          <p className="mt-1">Score {entry.score}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
                    Not enough persistent rounds have settled yet to build a public discipline snapshot.
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="fault-card rounded-[2rem] p-6 sm:p-8 text-sm leading-7 text-white/68">
          The reserve PDA could not be loaded from the current cluster.
        </section>
      )}
    </main>
  );
}
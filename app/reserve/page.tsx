import { ProgramBanner } from "@/components/game/program-banner";
import { getReserveSnapshot } from "@/lib/faultline/server-data";
import { formatLamports, shortKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReservePage() {
  const snapshot = await getReserveSnapshot();
  const reserve = snapshot.reserve;

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
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Distributed</p>
              <p className="mt-3 text-3xl text-white">{formatLamports(BigInt(reserve.totalDistributedLamports))}</p>
            </div>
            <div className="arena-stat rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Anti-grief</p>
              <p className="mt-3 text-3xl text-white">{formatLamports(BigInt(reserve.antiGriefCollectedLamports))}</p>
            </div>
            <div className="arena-stat rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Reveal timeouts</p>
              <p className="mt-3 text-3xl text-white">{formatLamports(BigInt(reserve.revealTimeoutCollectedLamports))}</p>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
            <div className="fault-card rounded-[2rem] p-6 sm:p-8">
              <p className="arena-kicker">Free Access State</p>
              <h2 className="mt-3 font-display text-2xl text-white">The economic rail exists, even if claim UX is not opened yet.</h2>
              <div className="mt-6 space-y-3">
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/72">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Feature flag</p>
                  <p className="mt-2 text-white">{reserve.freeAccessEnabled ? "Enabled on-chain" : "Disabled on-chain"}</p>
                </div>
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/72">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Free access distributed</p>
                  <p className="mt-2 text-white">{formatLamports(BigInt(reserve.freeAccessDistributedLamports))}</p>
                </div>
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
                  Today this page makes the reserve visible and auditable. The next product step is the actual eligibility and claim flow for free-access seats.
                </div>
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
        </>
      ) : (
        <section className="fault-card rounded-[2rem] p-6 sm:p-8 text-sm leading-7 text-white/68">
          The reserve PDA could not be loaded from the current cluster.
        </section>
      )}
    </main>
  );
}
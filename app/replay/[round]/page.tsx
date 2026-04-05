import Link from "next/link";
import type { Metadata } from "next";

import { ProgramBanner } from "@/components/game/program-banner";
import { findDefaultRoomPreset, PLAYER_STATUS_LABELS, RISK_LABELS, ROOM_STATUS_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { buildRoundReplaySlug, parseRoundReplaySlug, sortPersistentRoundLines } from "@/lib/faultline/metagame";
import { getPersistentRoundReplay } from "@/lib/faultline/server-data";
import { cn, formatLamports, shortKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ round: string }> }): Promise<Metadata> {
  const { round } = await params;
  const replay = await getPersistentRoundReplay(round);

  if (!replay) {
    return {
      title: "Replay | Faultline Arena",
      description: "Resolved round replay for Faultline Arena."
    };
  }

  const winner = replay.winnerWallets[0];

  return {
    title: `${formatLamports(BigInt(replay.stakeLamports))} Replay | Faultline Arena`,
    description: winner
      ? `Replay the resolved Faultline Arena round at ${formatLamports(BigInt(replay.stakeLamports))}. Winner: ${winner.slice(0, 6)}...${winner.slice(-4)}.`
      : `Replay the resolved Faultline Arena round at ${formatLamports(BigInt(replay.stakeLamports))}.`
  };
}

export default async function ReplayPage({ params }: { params: Promise<{ round: string }> }) {
  const { round } = await params;
  const replay = await getPersistentRoundReplay(round);

  if (!replay) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
        <ProgramBanner />
        <section className="fault-card rounded-[2rem] p-8 text-sm leading-7 text-white/68">
          This replay could not be found in the persistent ledger.
        </section>
      </main>
    );
  }

  const preset = findDefaultRoomPreset(replay.presetId);
  const rankedLines = sortPersistentRoundLines(replay);
  const histogramTotal = replay.finalHistogram.reduce((sum, value) => sum + value, 0);
  const winner = rankedLines.find((line) => line.finish === 1) ?? rankedLines[0] ?? null;
  const parsed = parseRoundReplaySlug(round);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="arena-kicker">Round Replay</p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl">
              {preset?.name ?? formatLamports(BigInt(replay.stakeLamports))} settled into a readable crowd map.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
              This replay is drawn from the persistent round ledger, so it survives after the live room resets. It is the post-mortem layer the base room page cannot keep forever.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="arena-chip" data-tone="flare">{ROOM_STATUS_LABELS[replay.status]}</span>
            <span className="arena-chip">{replay.revealedCount} reveals</span>
            <span className="arena-chip">Reserve {formatLamports(BigInt(replay.reserveFeeLamports))}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(BigInt(replay.stakeLamports))}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Total staked</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(BigInt(replay.totalStakedLamports))}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Distributable</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(BigInt(replay.distributableLamports))}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Round id</p>
            <p className="mt-3 text-2xl text-white">#{parsed?.createdSlot ?? replay.createdSlot}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-8">
          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Final Crowd Map</p>
            <h2 className="mt-3 font-display text-2xl text-white">Where the room actually ended up.</h2>
            <div className="mt-6 space-y-3">
              {replay.finalHistogram.map((value, index) => (
                <div key={ZONE_LABELS[index]}>
                  <div className="mb-2 flex items-center justify-between text-sm text-white/72">
                    <span>{ZONE_LABELS[index]}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="arena-result-bar h-2 rounded-full bg-gradient-to-r from-fault-ember to-fault-flare"
                      style={{ ["--arena-bar-width" as string]: `${histogramTotal === 0 ? 0 : (value / histogramTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Winning Read</p>
            <h2 className="mt-3 font-display text-2xl text-white">The cleanest priced read from this room.</h2>
            {winner ? (
              <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/72">
                <p className="text-white">
                  <Link href={`/players/${winner.wallet}`} className="transition hover:text-fault-flare">
                    {shortKey(winner.wallet, 6)}
                  </Link>{" "}
                  finished #{winner.finish ?? "-"} with zone {winner.zone === null ? "hidden" : ZONE_LABELS[winner.zone]} / {winner.riskBand === null ? "unknown risk" : RISK_LABELS[winner.riskBand]}.
                </p>
                <p className="mt-3">Error {winner.error ?? "-"} / Score {winner.scoreBps ?? "-"} / Payout {formatLamports(BigInt(winner.rewardLamports))}</p>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/68">
                No winning line could be reconstructed for this replay.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="arena-kicker">Full Board</p>
                <h2 className="mt-3 font-display text-2xl text-white">Every persisted line from this resolved round.</h2>
              </div>
              <div className="flex gap-3">
                <Link href={`/rooms/${replay.room}`} className="arena-secondary px-5 py-3 text-xs uppercase tracking-[0.2em]">Open room</Link>
                <Link href="/watch" className="arena-primary px-5 py-3 text-xs uppercase tracking-[0.2em]">Back to watch</Link>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {rankedLines.map((line, index) => (
                <div
                  key={`${line.wallet}:${index}`}
                  className={cn(
                    "grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[0.11fr_0.25fr_0.2fr_0.18fr_0.12fr_0.14fr] md:items-center",
                    line.finish === 1 && "border-fault-flare/35 bg-fault-flare/8"
                  )}
                >
                  <p className="font-display text-2xl text-fault-flare">#{line.finish ?? "-"}</p>
                  <div>
                    <Link href={`/players/${line.wallet}`} className="text-sm text-white transition hover:text-fault-flare">
                      {shortKey(line.wallet, 6)}
                    </Link>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">{PLAYER_STATUS_LABELS[line.status]}</p>
                  </div>
                  <p className="text-sm text-white/72">
                    {line.zone === null ? "Hidden lane" : `Zone ${ZONE_LABELS[line.zone]}`} / {line.riskBand === null ? "No risk" : RISK_LABELS[line.riskBand]}
                  </p>
                  <p className="text-sm text-white/72">Error {line.error ?? "-"} / Score {line.scoreBps ?? "-"}</p>
                  <p className="text-sm text-white/72">{formatLamports(BigInt(line.rewardLamports))}</p>
                  <p className="text-sm text-white/72">{line.claimed ? "Claimed" : "Unclaimed"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Replay Context</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
              <p>
                A replay is different from the live room page: it is frozen, shareable, and optimized for post-mortem reading rather than for sending transactions.
              </p>
              <p>
                If you want the living room loop again, reopen the underlying room. If you want to study why this round paid or missed, stay here.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
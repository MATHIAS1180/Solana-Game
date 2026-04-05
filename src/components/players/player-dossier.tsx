import { getFairAccessReadiness, getReserveAvailableLamports } from "@/lib/faultline/fair-access";
import type { PlayerAnalytics } from "@/lib/faultline/analytics";
import type { PersistentPlayerProfile } from "@/lib/faultline/metagame";
import { PLAYER_STATUS_LABELS, ROOM_STATUS_LABELS, RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import type { PlayerBoardSnapshot } from "@/lib/faultline/player-profile";
import type { SerializedFaultlineReserveAccount } from "@/lib/faultline/transport";
import { formatLamports, shortKey } from "@/lib/utils";

function getFormTone(input: { finish: number | null; rewardLamports: string; error: number | null }) {
  if (BigInt(input.rewardLamports) > 0n) {
    return "flare";
  }

  if (input.finish !== null && input.finish <= 3) {
    return "signal";
  }

  if (input.error === null) {
    return "ember";
  }

  return undefined;
}

export function PlayerDossier({
  snapshot,
  profile,
  reserve,
  analytics
}: {
  snapshot: PlayerBoardSnapshot;
  profile: PersistentPlayerProfile;
  reserve: SerializedFaultlineReserveAccount | null;
  analytics: PlayerAnalytics;
}) {
  const readiness = getFairAccessReadiness(profile, reserve);
  const primaryActiveLine = snapshot.activeLines[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="fault-card arena-pop-in rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="arena-kicker">Player Profile</p>
            <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">Wallet {shortKey(snapshot.wallet, 6)}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              Minimal profile: how often this wallet wins, how it tends to read the board, and whether anything is live right now.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="arena-chip" data-tone={readiness.tone}>{readiness.label}</span>
            <span className="arena-chip">Readiness {readiness.score}</span>
            {reserve ? <span className="arena-chip">Reserve {formatLamports(getReserveAvailableLamports(reserve))}</span> : null}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Rounds / wins</p>
            <p className="mt-3 text-2xl text-white">{profile.roundsPlayed} / {profile.roundsWon}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Career payout</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(BigInt(profile.totalPayoutLamports))}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Live pressure</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(snapshot.livePressureLamports)}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Average error</p>
            <p className="mt-3 text-2xl text-white">{profile.averageError === null ? "-" : profile.averageError.toFixed(1)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="fault-card rounded-[2rem] p-6 sm:p-8 arena-fade-in">
          <p className="arena-kicker">Style</p>
          <h2 className="mt-3 font-display text-2xl text-white">A compact read of how this wallet usually plays.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Favorite zone</p>
              <p className="mt-3 text-2xl text-white">{analytics.favoriteZone && analytics.favoriteZone.count > 0 ? analytics.favoriteZone.label : "-"}</p>
            </div>
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Favorite risk</p>
              <p className="mt-3 text-2xl text-white">{analytics.favoriteRisk && analytics.favoriteRisk.count > 0 ? analytics.favoriteRisk.label : "-"}</p>
            </div>
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Best finish</p>
              <p className="mt-3 text-2xl text-white">{analytics.bestFinish ?? "-"}</p>
            </div>
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Cash streak</p>
              <p className="mt-3 text-2xl text-white">{analytics.currentCashStreak} / {analytics.bestCashStreak}</p>
            </div>
          </div>
          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/68">
            {analytics.favoriteZone && analytics.favoriteZone.count > 0
              ? `${analytics.favoriteZone.label} is the most common landing zone, usually paired with ${analytics.favoriteRisk?.label ?? "mixed risk posture"}.`
              : "Not enough resolved reads yet to infer a stable style pattern."}
          </div>
        </div>

        <div className="fault-card rounded-[2rem] p-6 sm:p-8 arena-fade-in arena-delay-1">
          <p className="arena-kicker">Now</p>
          <h2 className="mt-3 font-display text-2xl text-white">Only the most useful live context.</h2>
          {primaryActiveLine ? (
            <div className="mt-6 rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Active seat</p>
              <a href={`/rooms/${primaryActiveLine.roomAddress}`} className="mt-3 block font-display text-2xl text-white transition hover:text-fault-flare">
                {formatLamports(primaryActiveLine.stakeLamports)} Arena
              </a>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="arena-chip" data-tone="signal">{ROOM_STATUS_LABELS[primaryActiveLine.roomStatus]}</span>
                <span className="arena-chip">{PLAYER_STATUS_LABELS[primaryActiveLine.playerStatus]}</span>
                <span className="arena-chip">{primaryActiveLine.zone !== null ? `Zone ${ZONE_LABELS[primaryActiveLine.zone]}` : "Read hidden"}</span>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.8rem] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/68">
              No live seat is visible right now for this wallet.
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Visible payouts</p>
              <p className="mt-2 text-xl text-white">{formatLamports(snapshot.totalPayoutLamports)}</p>
            </div>
            <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Seats / wins</p>
              <p className="mt-2 text-xl text-white">{snapshot.activeSeats + snapshot.settledLines.length} / {snapshot.wins}</p>
            </div>
            <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Reveal streak</p>
              <p className="mt-2 text-xl text-white">{analytics.currentRevealStreak} / {analytics.bestRevealStreak}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8 arena-fade-in">
        <p className="arena-kicker">Recent Form</p>
        <h2 className="mt-3 font-display text-2xl text-white">The last resolved reads, nothing more.</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {analytics.recentForm.length > 0 ? (
            analytics.recentForm.map((entry) => (
              <span key={`${entry.id}-ribbon`} className="arena-chip" data-tone={getFormTone(entry)}>
                {entry.finish !== null ? `#${entry.finish}` : "x"} · {BigInt(entry.rewardLamports) > 0n ? "paid" : entry.error === null ? "sealed" : "miss"}
              </span>
            ))
          ) : (
            <span className="text-sm text-white/62">No recent persistent form yet.</span>
          )}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {analytics.recentForm.length > 0 ? (
            analytics.recentForm.slice(0, 4).map((entry) => (
              <div key={entry.id} className="arena-surface rounded-2xl p-4 text-sm text-white/72">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">{formatLamports(BigInt(entry.stakeLamports))}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="arena-chip" data-tone={getFormTone(entry)}>Finish {entry.finish ?? "-"}</span>
                  <span className="arena-chip">{BigInt(entry.rewardLamports) > 0n ? formatLamports(BigInt(entry.rewardLamports)) : "No payout"}</span>
                </div>
                <p className="mt-3 text-white/62">
                  {entry.zone === null ? "Unrevealed or timed out" : `Zone ${ZONE_LABELS[entry.zone]} / ${RISK_LABELS[entry.riskBand ?? 0]}`}
                </p>
              </div>
            ))
          ) : (
            <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68 md:col-span-2 xl:col-span-4">
              No resolved persistent appearances are available yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
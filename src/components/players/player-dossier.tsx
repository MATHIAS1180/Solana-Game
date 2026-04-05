import type { PersistentPlayerProfile } from "@/lib/faultline/metagame";
import { PLAYER_STATUS_LABELS, ROOM_STATUS_LABELS, RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import type { PlayerBoardSnapshot } from "@/lib/faultline/player-profile";
import { formatLamports, shortKey } from "@/lib/utils";

export function PlayerDossier({ snapshot, profile }: { snapshot: PlayerBoardSnapshot; profile: PersistentPlayerProfile }) {
  return (
    <div className="space-y-8">
      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Persistent Metagame</p>
        <h2 className="mt-3 font-display text-2xl text-white">Career footprint across resolved rounds.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Rounds / wins</p>
            <p className="mt-3 text-2xl text-white">{profile.roundsPlayed} / {profile.roundsWon}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Career payout</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(BigInt(profile.totalPayoutLamports))}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Best score</p>
            <p className="mt-3 text-2xl text-white">{profile.bestScoreBps ?? "-"}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Average error</p>
            <p className="mt-3 text-2xl text-white">{profile.averageError === null ? "-" : profile.averageError.toFixed(1)}</p>
          </div>
        </div>
        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/68">
          This layer persists resolved rounds as they pass through the live board, so rivalries and long-term accuracy no longer disappear when the next room resets.
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Visible Board Dossier</p>
        <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">Wallet {shortKey(snapshot.wallet, 6)}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          This profile is derived from the live system rooms currently visible on-chain. It is a real board snapshot, not a long-term archive.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Live pressure</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(snapshot.livePressureLamports)}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Visible payouts</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(snapshot.totalPayoutLamports)}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Seats / wins</p>
            <p className="mt-3 text-2xl text-white">{snapshot.activeSeats + snapshot.settledLines.length} / {snapshot.wins}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Average error</p>
            <p className="mt-3 text-2xl text-white">{snapshot.averageError === null ? "-" : snapshot.averageError.toFixed(1)}</p>
          </div>
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Live Reads</p>
        <h2 className="mt-3 font-display text-2xl text-white">Current exposure across the visible arenas.</h2>
        <div className="mt-6 space-y-3">
          {snapshot.activeLines.length > 0 ? (
            snapshot.activeLines.map((line) => (
              <div key={`${line.roomAddress}:active`} className="arena-surface rounded-2xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <a href={`/rooms/${line.roomAddress}`} className="font-display text-xl text-white transition hover:text-fault-flare">
                      {formatLamports(line.stakeLamports)} Arena
                    </a>
                    <p className="mt-1 text-sm text-white/68">{ROOM_STATUS_LABELS[line.roomStatus]} / {PLAYER_STATUS_LABELS[line.playerStatus]}</p>
                  </div>
                  <div className="text-sm text-white/72 sm:text-right">
                    <p>{line.zone !== null ? `Zone ${ZONE_LABELS[line.zone]} / ${RISK_LABELS[line.riskBand ?? 0]}` : "Read still hidden"}</p>
                    <p className="mt-1">Room {shortKey(line.roomAddress, 6)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
              This wallet has no live seat across the currently visible system board.
            </div>
          )}
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Visible Settlements</p>
        <h2 className="mt-3 font-display text-2xl text-white">Recent outcomes still readable from current room state.</h2>
        <div className="mt-6 space-y-3">
          {snapshot.settledLines.length > 0 ? (
            snapshot.settledLines.map((line) => (
              <div key={`${line.roomAddress}:settled`} className="arena-surface rounded-2xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <a href={`/rooms/${line.roomAddress}`} className="font-display text-xl text-white transition hover:text-fault-flare">
                      {formatLamports(line.stakeLamports)} Arena
                    </a>
                    <p className="mt-1 text-sm text-white/68">{ROOM_STATUS_LABELS[line.roomStatus]} / {PLAYER_STATUS_LABELS[line.playerStatus]}</p>
                  </div>
                  <div className="text-sm text-white/72 sm:text-right">
                    <p>{line.rewardLamports > 0n ? `Payout ${formatLamports(line.rewardLamports)}` : "No payout from this round"}</p>
                    <p className="mt-1">{line.error !== null ? `Error ${line.error} / Score ${line.scoreBps ?? 0}` : "Hidden or unresolved read"}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
              No settled seat for this wallet is currently visible on the live system board.
            </div>
          )}
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Recent Persistent Rounds</p>
        <h2 className="mt-3 font-display text-2xl text-white">Last resolved appearances that stayed in the metagame ledger.</h2>
        <div className="mt-6 space-y-3">
          {profile.recentRounds.length > 0 ? (
            profile.recentRounds.map((round) => (
              <div key={round.id} className="arena-surface rounded-2xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <a href={`/rooms/${round.room}`} className="font-display text-xl text-white transition hover:text-fault-flare">
                      {formatLamports(BigInt(round.stakeLamports))} Arena
                    </a>
                    <p className="mt-1 text-sm text-white/68">{ROOM_STATUS_LABELS[round.status]} / finish {round.finish ?? "-"}</p>
                  </div>
                  <div className="text-sm text-white/72 sm:text-right">
                    <p>{BigInt(round.rewardLamports) > 0n ? `Payout ${formatLamports(BigInt(round.rewardLamports))}` : "No payout"}</p>
                    <p className="mt-1">{round.error === null ? "No revealed error recorded" : `Error ${round.error} / Score ${round.scoreBps ?? 0}`}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
              No resolved round has been persisted for this wallet yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
import { Trophy } from "lucide-react";

import { RISK_LABELS, ROOM_STATUS, ZONE_LABELS } from "@/lib/faultline/constants";
import { describeNearMiss, scoreResolvedRoom } from "@/lib/faultline/logic";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { formatLamports, shortKey } from "@/lib/utils";

export function ResultPanel({ room, playerIndex }: { room: FaultlineRoomAccount; playerIndex: number }) {
  if (room.status !== ROOM_STATUS.Resolved) {
    if (room.status !== ROOM_STATUS.Cancelled) {
      return null;
    }

    return (
      <div className="fault-card rounded-[1.75rem] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Room Cancelled</p>
        <h2 className="mt-3 font-display text-2xl text-white">La room n’a pas atteint une fin jouable valide</h2>
        <p className="mt-4 text-sm leading-7 text-white/72">
          Les refunds sont visibles au niveau de chaque joueur. Les commit no-show peuvent subir une retenue anti-grief, conformement au whitepaper.
        </p>
      </div>
    );
  }

  const { histogram, scoredPlayers } = scoreResolvedRoom(room);
  const rank = scoredPlayers.findIndex((entry) => entry.index === playerIndex);
  const player = rank >= 0 ? scoredPlayers[rank] : null;
  const winner = scoredPlayers[0];

  return (
    <div className="fault-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Result Analytics</p>
          <h2 className="mt-3 font-display text-3xl text-white">Pourquoi la room s’est resolue ainsi</h2>
        </div>
        <Trophy className="size-5 text-fault-flare" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/8 bg-black/25 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Histogramme reel</p>
            <div className="mt-4 space-y-3">
              {histogram.map((value, index) => (
                <div key={index}>
                  <div className="mb-2 flex items-center justify-between text-sm text-white/72">
                    <span>{ZONE_LABELS[index]}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-fault-ember to-fault-flare"
                      style={{ width: `${histogram.reduce((sum, item) => sum + item, 0) === 0 ? 0 : (value / histogram.reduce((sum, item) => sum + item, 0)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {player ? (
            <div className="rounded-3xl border border-white/8 bg-black/25 p-5 text-sm leading-7 text-white/72">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Ton resultat</p>
              <p className="mt-3 text-white">Rang #{rank + 1}</p>
              <p>Zone {ZONE_LABELS[player.zone]} / {RISK_LABELS[player.riskBand]}</p>
              <p>Erreur absolue: {player.error}</p>
              <p>Score: {player.scoreBps}</p>
              <p>Reward: {formatLamports(room.playerRewardsLamports[player.index])}</p>
              <p className="mt-3 text-fault-flare">{describeNearMiss(player.riskBand, player.zone, histogram)}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/8 bg-black/25 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Classement final</p>
            <div className="mt-4 space-y-3">
              {scoredPlayers.slice(0, 8).map((entry, index) => (
                <div key={entry.index} className="grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[0.12fr_0.28fr_0.2fr_0.2fr_0.2fr] md:items-center">
                  <p className="font-display text-2xl text-fault-flare">#{index + 1}</p>
                  <div>
                    <p className="text-sm text-white">{shortKey(room.playerKeys[entry.index], 6)}</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">Zone {ZONE_LABELS[entry.zone]} / {RISK_LABELS[entry.riskBand]}</p>
                  </div>
                  <p className="text-sm text-white/72">Forecast [{entry.forecast.join(", ")}]</p>
                  <p className="text-sm text-white/72">Erreur {entry.error}</p>
                  <p className="text-sm text-white/72">Gain {formatLamports(room.playerRewardsLamports[entry.index])}</p>
                </div>
              ))}
            </div>
          </div>

          {winner ? (
            <div className="rounded-3xl border border-fault-flare/20 bg-fault-flare/5 p-5 text-sm leading-7 text-white/72">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-fault-flare">Lecture gagnante</p>
              <p className="mt-3 text-white">
                {shortKey(room.playerKeys[winner.index], 6)} gagne avec un score {winner.scoreBps}, une erreur {winner.error}, la zone {ZONE_LABELS[winner.zone]} et le risk band {RISK_LABELS[winner.riskBand]}.
              </p>
              {player && player.index !== winner.index ? (
                <p className="mt-3">
                  Le delta principal contre toi: {winner.error < player.error ? `le gagnant a mieux anticipe l’histogramme (${winner.error} contre ${player.error})` : `le tie-break a favorise une zone finale moins congestionnee`}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";

import { BarChart3, Copy, Medal, Share2, Trophy } from "lucide-react";

import { useToast } from "@/components/ui/toast-provider";
import { RISK_LABELS, ROOM_STATUS, ZONE_LABELS } from "@/lib/faultline/constants";
import { describeNearMiss, scoreResolvedRoom } from "@/lib/faultline/logic";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { cn, formatLamports, shortKey } from "@/lib/utils";

export function ResultPanel({
  room,
  playerIndex,
  roomHref
}: {
  room: FaultlineRoomAccount;
  playerIndex: number;
  roomHref: string;
}) {
  const toast = useToast();

  if (room.status !== ROOM_STATUS.Resolved) {
    if (room.status !== ROOM_STATUS.Cancelled) {
      return null;
    }

    return (
      <div className="fault-card rounded-[1.75rem] p-6">
        <p className="arena-kicker">Round Cancelled</p>
        <h2 className="mt-3 font-display text-2xl text-white">This room never reached a valid scoring state.</h2>
        <p className="mt-4 text-sm leading-7 text-white/72">
          Refunds are tracked per player. Seats that failed the commit or reveal obligations can still absorb the anti-grief retention defined in the whitepaper.
        </p>
      </div>
    );
  }

  const { histogram, scoredPlayers } = scoreResolvedRoom(room);
  const histogramTotal = histogram.reduce((sum, value) => sum + value, 0);
  const rank = scoredPlayers.findIndex((entry) => entry.index === playerIndex);
  const player = rank >= 0 ? scoredPlayers[rank] : null;
  const winner = scoredPlayers[0];
  const payoutCutoff = room.winnerCount > 0 ? scoredPlayers[Math.min(room.winnerCount, scoredPlayers.length) - 1] ?? null : null;

  async function copyRoomLink() {
    try {
      const shareUrl = new URL(roomHref, window.location.origin).toString();
      await navigator.clipboard.writeText(shareUrl);
      toast({
        tone: "success",
        title: "Room link copied",
        description: "Send the lane to someone else and let them judge the read.",
        durationMs: 5200
      });
    } catch {
      toast({
        tone: "error",
        title: "Copy failed",
        description: "Your browser blocked clipboard access for this room link."
      });
    }
  }

  async function shareRound() {
    const shareUrl = new URL(roomHref, window.location.origin).toString();
    const shareText = player
      ? `I finished #${rank + 1} in Faultline Arena on ${formatLamports(room.stakeLamports)} with ${RISK_LABELS[player.riskBand]}.`
      : "Watch how this Faultline Arena room resolved and where the crowd actually landed.";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Faultline Arena result",
          text: shareText,
          url: shareUrl
        });
        return;
      } catch {
        // Fall through to clipboard.
      }
    }

    await copyRoomLink();
  }

  return (
    <div className="fault-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="arena-kicker">Result Analytics</p>
          <h2 className="mt-3 font-display text-3xl text-white">See how the crowd actually formed and why this read won.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
            Faultline scores the accuracy of each hidden forecast against the revealed population map, then applies risk-band rules to separate sharp reads from safer ones.
          </p>
        </div>
        <Trophy className="size-5 text-fault-flare" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-4">
          <div className="arena-surface rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Final histogram</p>
            <div className="mt-4 space-y-3">
              {histogram.map((value, index) => (
                <div key={index} className="arena-grid-glow">
                  <div className="mb-2 flex items-center justify-between text-sm text-white/72">
                    <span className="inline-flex items-center gap-2">
                      <BarChart3 className="size-4 text-fault-signal" />
                      {ZONE_LABELS[index]}
                    </span>
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

          {player ? (
            <div className="arena-surface rounded-3xl p-5 text-sm leading-7 text-white/72">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Your finish</p>
              <p className="mt-3 text-white">Rank #{rank + 1}</p>
              <p>Read: zone {ZONE_LABELS[player.zone]} / {RISK_LABELS[player.riskBand]}</p>
              <p>Forecast miss: {player.error}</p>
              <p>Score: {player.scoreBps}</p>
              <p>Payout: {formatLamports(room.playerRewardsLamports[player.index])}</p>
              <p className="mt-3 text-fault-flare">{describeNearMiss(player.riskBand, player.zone, histogram)}</p>
              {payoutCutoff && rank >= room.winnerCount ? (
                <p className="mt-3 text-white/78">
                  Cash line this round: rank #{room.winnerCount} at score {payoutCutoff.scoreBps}. You were {payoutCutoff.scoreBps - player.scoreBps} points short of the paying band.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="arena-surface rounded-3xl p-5 text-sm leading-7 text-white/72">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Next move</p>
            <p className="mt-3 text-white/82">
              A resolved round should not end cold. Queue the same lane again or share the outcome while the read is still fresh.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href={`${roomHref}#room-actions`} className="arena-primary px-5 py-3 text-center text-xs uppercase tracking-[0.2em]">
                Queue next read
              </a>
              <button type="button" onClick={() => void shareRound()} className="arena-secondary px-5 py-3 text-xs uppercase tracking-[0.2em]">
                <Share2 className="size-4" />
                Share result
              </button>
              <button type="button" onClick={() => void copyRoomLink()} className="arena-secondary px-5 py-3 text-xs uppercase tracking-[0.2em] sm:col-span-2">
                <Copy className="size-4" />
                Copy room link
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {winner ? (
            <div className="arena-surface rounded-3xl p-5 text-sm leading-7 text-white/72">
              <div className="flex flex-wrap items-center gap-3">
                <span className="arena-chip" data-tone="flare">
                  <Trophy className="size-3.5" />
                  Winning read
                </span>
                <span className="arena-chip" data-tone="signal">
                  <Medal className="size-3.5" />
                  {formatLamports(room.playerRewardsLamports[winner.index])}
                </span>
              </div>
              <p className="mt-4 text-white">
                <a href={`/players/${room.playerKeys[winner.index].toBase58()}`} className="transition hover:text-fault-flare">
                  {shortKey(room.playerKeys[winner.index], 6)}
                </a>{" "}
                wins with the cleanest priced read: score {winner.scoreBps}, miss {winner.error}, zone {ZONE_LABELS[winner.zone]}, risk band {RISK_LABELS[winner.riskBand]}.
              </p>
              {player && player.index !== winner.index ? (
                <p className="mt-3">
                  Main delta versus your entry: {winner.error < player.error ? `the winner matched the final histogram more tightly (${winner.error} versus ${player.error})` : `the tiebreak leaned toward a cleaner final zone with less crowding pressure`}.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="arena-surface rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Top reads</p>
            <div className="mt-4 space-y-3">
              {scoredPlayers.slice(0, 8).map((entry, index) => (
                <div
                  key={entry.index}
                  className={cn(
                    "grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[0.12fr_0.28fr_0.2fr_0.2fr_0.2fr] md:items-center",
                    index === 0 && "border-fault-flare/35 bg-fault-flare/8",
                    playerIndex === entry.index && "border-fault-signal/35 bg-fault-signal/6"
                  )}
                >
                  <p className="font-display text-2xl text-fault-flare">#{index + 1}</p>
                  <div>
                    <p className="text-sm text-white">
                      <a href={`/players/${room.playerKeys[entry.index].toBase58()}`} className="transition hover:text-fault-flare">
                        {shortKey(room.playerKeys[entry.index], 6)}
                      </a>
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">Zone {ZONE_LABELS[entry.zone]} / {RISK_LABELS[entry.riskBand]}</p>
                  </div>
                  <p className="text-sm text-white/72">Forecast [{entry.forecast.join(", ")}]</p>
                  <p className="text-sm text-white/72">Error {entry.error}</p>
                  <p className="text-sm text-white/72">Payout {formatLamports(room.playerRewardsLamports[entry.index])}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
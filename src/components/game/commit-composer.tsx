"use client";

import { useEffect, useMemo, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Flame, LoaderCircle, Lock, ShieldAlert, Target } from "lucide-react";

import { TransactionSpeedControl } from "@/components/game/transaction-speed-control";
import { useToast } from "@/components/ui/toast-provider";
import { FAULTLINE_COMMIT_VERSION, PLAYER_STATUS, RISK_LABELS, ROOM_STATUS, ZONE_LABELS } from "@/lib/faultline/constants";
import { buildCommitHash, generateNonce, validateForecast } from "@/lib/faultline/commit";
import { createCancelExpiredRoomIx, createInitRoomIx, createJoinAndCommitIx, createSubmitCommitIx } from "@/lib/faultline/instructions";
import { assignPayouts, computeBaseScore, computeDistributablePot, getRiskMultiplier } from "@/lib/faultline/logic";
import { fetchRoom, findPlayerIndex } from "@/lib/faultline/rooms";
import { persistCommitPayload } from "@/lib/faultline/storage";
import type { FaultlineRoomAccount, Forecast, RiskBand, StoredCommitPayload, Zone } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm, type TransactionSpeed } from "@/lib/solana/transactions";
import { cn, formatLamports, shortKey } from "@/lib/utils";

type RelayRecoveryStatus = {
  checking: boolean;
  configured: boolean;
  mirrored: boolean;
  ttlDays: number;
  error: string | null;
};

function getDefaultForecast(room: FaultlineRoomAccount): Forecast {
  const base = Math.floor(room.minPlayers / 5);
  const histogram: Forecast = [base, base, base, base, base];
  for (let index = 0; index < room.minPlayers - base * 5; index += 1) {
    histogram[index] += 1;
  }
  return histogram;
}

function getForecastPresets(room: FaultlineRoomAccount, zone: Zone) {
  const total = Math.max(room.minPlayers + 1, room.playerCount + 1);
  const balanced = getDefaultForecast({ ...room, minPlayers: total });
  const center = [0, 0, 0, 0, 0] as Forecast;
  center[2] = total;
  const edges = [Math.ceil(total / 3), Math.floor(total / 6), Math.floor(total / 6), Math.floor(total / 6), 0] as Forecast;
  edges[4] = total - edges[0] - edges[1] - edges[2] - edges[3];
  const conviction = [0, 0, 0, 0, 0] as Forecast;
  conviction[zone] = Math.max(1, Math.ceil(total / 2));
  const spill = total - conviction[zone];
  for (let index = 0; index < conviction.length; index += 1) {
    if (index === zone) {
      continue;
    }
    conviction[index] = Math.floor(spill / 4);
  }
  conviction[(zone + 1) % 5] += spill - conviction.reduce((sum, value) => sum + value, 0);

  return [
    { label: "Balanced", detail: "Neutral room map", forecast: balanced },
    { label: "Center crush", detail: "Crowd collapses inward", forecast: center },
    { label: "Edge drift", detail: "Pressure splits outward", forecast: edges },
    { label: "Conviction", detail: `Lean into zone ${ZONE_LABELS[zone]}`, forecast: conviction }
  ] as const;
}

function downloadCommitBackup(record: StoredCommitPayload) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `faultline-reveal-backup-${record.room.slice(0, 8)}-${record.createdAt}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function storeRelayBackup(record: StoredCommitPayload) {
  const response = await fetch("/api/automation/commit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(record)
  });

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "The relay backup could not be stored.");
  }
}

export function CommitComposer({
  room,
  playerIndex,
  presetId = null,
  onCommitted
}: {
  room: FaultlineRoomAccount;
  playerIndex: number;
  presetId?: number | null;
  onCommitted: () => Promise<void>;
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const programId = getFaultlineProgramId();
  const toast = useToast();
  const [zone, setZone] = useState<Zone>(0);
  const [riskBand, setRiskBand] = useState<RiskBand>(0);
  const [forecast, setForecast] = useState<Forecast>(() => getDefaultForecast(room));
  const [pending, setPending] = useState(false);
  const [downloadBackup, setDownloadBackup] = useState(true);
  const [storeRelayRecovery, setStoreRelayRecovery] = useState(false);
  const [transactionSpeed, setTransactionSpeed] = useState<TransactionSpeed>("balanced");
  const [relayRecoveryStatus, setRelayRecoveryStatus] = useState<RelayRecoveryStatus>({
    checking: true,
    configured: false,
    mirrored: false,
    ttlDays: 7,
    error: null
  });
  const isJoined = playerIndex >= 0;

  const validation = useMemo(() => validateForecast(forecast, room.minPlayers, room.maxPlayers), [forecast, room.maxPlayers, room.minPlayers]);
  const forecastPresets = useMemo(() => getForecastPresets(room, zone), [room, zone]);
  const projectedOutcome = useMemo(() => {
    if (!validation.valid) {
      return null;
    }

    const projectedPlayers = Math.max(room.minPlayers, validation.total);
    const projectedPot = BigInt(projectedPlayers) * room.stakeLamports;
    const distributable = computeDistributablePot(projectedPot, 0n);
    const { rewards } = assignPayouts(distributable, projectedPlayers);
    const multiplier = getRiskMultiplier(riskBand, zone, forecast);
    const baseScore = computeBaseScore(projectedPlayers, 0);

    return {
      projectedPlayers,
      topPayout: rewards[0] ?? 0n,
      cashLine: rewards[Math.min(room.winnerCount, rewards.length) - 1] ?? 0n,
      multiplier,
      baseScore,
      zoneLoad: forecast[zone],
      cleanestLoad: Math.min(...forecast)
    };
  }, [forecast, riskBand, room.minPlayers, room.stakeLamports, room.winnerCount, validation.total, validation.valid, zone]);
  const hasPortableRecoveryPath = downloadBackup || (storeRelayRecovery && relayRecoveryStatus.configured);

  useEffect(() => {
    let cancelled = false;

    async function loadRelayRecoveryStatus() {
      try {
        const query = publicKey
          ? `/api/automation/commit?room=${encodeURIComponent(room.publicKey.toBase58())}&player=${encodeURIComponent(publicKey.toBase58())}`
          : "/api/automation/commit";
        const response = await fetch(query, { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          configured?: boolean;
          mirrored?: boolean;
          ttlDays?: number;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Unable to check relay recovery status.");
        }

        if (!cancelled) {
          setRelayRecoveryStatus({
            checking: false,
            configured: Boolean(payload.configured),
            mirrored: Boolean(payload.mirrored),
            ttlDays: payload.ttlDays ?? 7,
            error: null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setRelayRecoveryStatus({
            checking: false,
            configured: false,
            mirrored: false,
            ttlDays: 7,
            error: error instanceof Error ? error.message : "Unable to check relay recovery status."
          });
        }
      }
    }

    void loadRelayRecoveryStatus();

    return () => {
      cancelled = true;
    };
  }, [publicKey, room.publicKey]);

  useEffect(() => {
    if (!relayRecoveryStatus.configured && storeRelayRecovery) {
      setStoreRelayRecovery(false);
    }
  }, [relayRecoveryStatus.configured, storeRelayRecovery]);

  function isExpiredUnderMinPlayers(candidate: FaultlineRoomAccount, currentSlot: number) {
    return (
      candidate.status === ROOM_STATUS.Open &&
      candidate.playerCount > 0 &&
      Number(candidate.joinDeadlineSlot) > 0 &&
      currentSlot > Number(candidate.joinDeadlineSlot) &&
      candidate.playerCount < candidate.minPlayers
    );
  }

  async function submitCommit() {
    if (!publicKey || !sendTransaction || !programId) {
      toast({
        tone: "error",
        title: "Wallet required",
        description: "Connect a wallet and ensure the Faultline program ID is configured before committing."
      });
      return;
    }

    if (!validation.valid) {
      toast({
        tone: "error",
        title: "Invalid forecast total",
        description: `Your vector must sum to a value between ${room.minPlayers} and ${room.maxPlayers}.`
      });
      return;
    }

    if (!hasPortableRecoveryPath) {
      const confirmed = window.confirm(
        "No portable recovery path is selected. If you switch browser or device before reveal, only this local browser state will still hold the manual reveal payload. Continue anyway?"
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      setPending(true);

      const [latestRoom, currentSlot] = await Promise.all([fetchRoom(connection, room.publicKey), connection.getSlot("confirmed")]);
      const latestPlayerIndex = latestRoom ? findPlayerIndex(latestRoom, publicKey) : -1;
      const targetPresetId = latestRoom?.presetId ?? presetId;
      const needsResetBeforeJoin = latestRoom ? isExpiredUnderMinPlayers(latestRoom, currentSlot) : false;

      if (!latestRoom && targetPresetId === null) {
        throw new Error("This room does not exist on-chain yet and no system preset is attached to this page.");
      }

      if (latestRoom && latestPlayerIndex === -1 && !needsResetBeforeJoin) {
        const joinDeadlineClosed = latestRoom.playerCount > 0 && Number(latestRoom.joinDeadlineSlot) > 0 && currentSlot > Number(latestRoom.joinDeadlineSlot);
        if (latestRoom.status !== ROOM_STATUS.Open || joinDeadlineClosed || latestRoom.playerCount >= latestRoom.maxPlayers) {
          throw new Error("This room is no longer joinable. Refresh the page to load the current live state.");
        }
      }

      if (latestRoom && latestPlayerIndex !== -1 && latestRoom.playerStatuses[latestPlayerIndex] !== PLAYER_STATUS.Joined) {
        throw new Error("This seat is no longer waiting for a commit. Refresh the page before sending another action.");
      }

      const nonce = generateNonce();
      const targetRoomKey = latestRoom?.publicKey ?? room.publicKey;
      const roundId = latestRoom?.createdSlot ?? BigInt(currentSlot);
      const payload = {
        room: targetRoomKey,
        player: publicKey,
        roundId,
        zone,
        riskBand,
        forecast,
        nonce
      };
      const commitHash = buildCommitHash(payload);

      const storedPayload = {
        room: targetRoomKey.toBase58(),
        player: publicKey.toBase58(),
        roundId: roundId.toString(),
        commitVersion: FAULTLINE_COMMIT_VERSION,
        zone,
        riskBand,
        forecast,
        nonce: Array.from(nonce),
        commitHash: Array.from(commitHash),
        createdAt: Date.now()
      };

      await persistCommitPayload(storedPayload);

      const transaction = new Transaction();

      if (!latestRoom) {
        transaction.add(
          await createInitRoomIx({
            programId,
            creator: publicKey,
            presetId: targetPresetId!,
            roundId
          })
        );
        transaction.add(
          await createJoinAndCommitIx({
            programId,
            player: publicKey,
            room: room.publicKey,
            commitHash
          })
        );
      } else if (latestPlayerIndex === -1) {
        if (needsResetBeforeJoin) {
          transaction.add(
            await createCancelExpiredRoomIx({
              programId,
              caller: publicKey,
              room: latestRoom.publicKey,
              refundPlayers: latestRoom.playerKeys.slice(0, latestRoom.playerCount)
            })
          );
        }

        transaction.add(
          await createJoinAndCommitIx({
            programId,
            player: publicKey,
            room: latestRoom.publicKey,
            commitHash
          })
        );
      } else {
        transaction.add(
          createSubmitCommitIx({
            programId,
            player: publicKey,
            room: latestRoom.publicKey,
            commitHash
          })
        );
      }

      await sendAndConfirm(connection, sendTransaction, publicKey, transaction, {
        speed: transactionSpeed,
        maxAttempts: transactionSpeed === "none" ? 1 : 2
      });

      let relayBackupStored = false;
      if (storeRelayRecovery) {
        try {
          await storeRelayBackup(storedPayload);
          relayBackupStored = true;
          setRelayRecoveryStatus((current) => ({
            ...current,
            checking: false,
            configured: true,
            mirrored: true,
            error: null
          }));
        } catch (backupError) {
          toast({
            tone: "info",
            title: "Commit confirmed, relay backup skipped",
            description:
              backupError instanceof Error
                ? `${backupError.message} Your local reveal payload is still safe in this browser.`
                : "The relay backup could not be stored, but your local reveal payload is still safe in this browser.",
            durationMs: 7600
          });
        }
      }

      if (downloadBackup) {
        downloadCommitBackup(storedPayload);
      }
      toast({
        tone: "success",
        title: !latestRoom ? "Room opened and read locked" : latestPlayerIndex === -1 ? "Seat claimed and read locked" : "Read locked",
        description: relayBackupStored
          ? `Your reveal key was saved locally for ${shortKey(room.publicKey)}, mirrored to the relay for 7-day recovery, and ready for cross-device reveal.`
          : downloadBackup
            ? `Your reveal key was saved locally for ${shortKey(room.publicKey)} and a recovery file was downloaded for cross-device reveal.`
            : `Your reveal key was saved locally for ${shortKey(room.publicKey)}. Keep this browser state for reveal, or export a backup before switching device.`,
        durationMs: 7600
      });
      await onCommitted();
    } catch (error) {
      toast({
        tone: "error",
        title: error instanceof Error && error.message.includes("Database") ? "Local storage unavailable" : "Commit failed",
        description:
          error instanceof Error && error.message.includes("Database")
            ? "IndexedDB is unavailable, so the reveal payload cannot be preserved for the reveal phase. Enable browser storage before entering the room."
            : error instanceof Error
              ? error.message
              : "The commit transaction could not be completed.",
        durationMs: 7600
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fault-card rounded-[1.75rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="arena-kicker">Commit Composer</p>
          <h2 className="mt-3 font-display text-2xl text-white">Lock your crowd read before the room reveals its shape.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
            You are not choosing a personal move. You are pricing the behavior of everyone else, then hiding that read until reveal.
          </p>
        </div>
        <Lock className="size-5 text-fault-flare" />
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-sm text-white/70">Target zone</p>
          <p className="mt-2 text-sm leading-6 text-white/52">Pick the zone you believe will finish with the best crowd imbalance once all reveals are in.</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {ZONE_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setZone(index as Zone)}
                className={`rounded-2xl border px-3 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] transition ${zone === index ? "border-fault-ember bg-fault-ember text-fault-basalt" : "border-white/10 bg-black/20 text-white/70 hover:border-white/30"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-white/70">Risk band</p>
          <p className="mt-2 text-sm leading-6 text-white/52">Higher bands pay for precision. Lower bands survive broader player traffic.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {RISK_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setRiskBand(index as RiskBand)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${riskBand === index ? "border-fault-flare bg-fault-flare/10 text-white" : "border-white/10 bg-black/20 text-white/70 hover:border-white/30"}`}
              >
                <span className="font-display text-lg">{label}</span>
                <span className="mt-2 block text-xs uppercase tracking-[0.22em] text-white/48">
                  {index === 0 ? "Stays live across wider outcomes" : index === 1 ? "Wins by reading lighter pockets" : "Only wins on the cleanest lane"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm text-white/70">
            <p>Forecast vector</p>
            <p className={validation.valid ? "text-emerald-200" : "text-fault-flare"}>Total {validation.total}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/52">Model how many total players you expect in each zone at resolution. Your error is measured against this final histogram.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {forecastPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setForecast([...preset.forecast] as Forecast)}
                className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left text-white/74 transition hover:border-white/25 hover:text-white"
              >
                <p className="font-display text-base text-white">{preset.label}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/45">{preset.detail}</p>
                <p className="mt-2 font-mono text-xs text-white/62">[{preset.forecast.join(", ")}]</p>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {forecast.map((value, index) => (
              <label key={index} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center text-white/75">
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">{ZONE_LABELS[index]}</span>
                <input
                  type="number"
                  min={0}
                  max={room.maxPlayers}
                  value={value}
                  onChange={(event) => {
                    const next = [...forecast] as Forecast;
                    next[index] = Number(event.target.value);
                    setForecast(next);
                  }}
                  className="mt-2 w-full bg-transparent text-center text-xl text-white outline-none"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {forecast.map((value, index) => {
              const share = validation.total > 0 ? (value / validation.total) * 100 : 0;
              return (
                <div key={`${ZONE_LABELS[index]}-pressure`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/45">
                    <span>{ZONE_LABELS[index]}</span>
                    <span>{share.toFixed(0)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className={cn("h-2 rounded-full bg-gradient-to-r", index === zone ? "from-fault-flare to-fault-ember" : "from-fault-signal/70 to-white/40")} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/70">
            <p className="inline-flex items-center gap-2 text-fault-flare">
              <Target className="size-4" />
              Projection if your room read lands exactly.
            </p>
            {projectedOutcome ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Projected field</p>
                  <p className="mt-2 text-xl text-white">{projectedOutcome.projectedPlayers} players</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Top payout</p>
                  <p className="mt-2 text-xl text-white">{formatLamports(projectedOutcome.topPayout)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Cash line</p>
                  <p className="mt-2 text-xl text-white">{formatLamports(projectedOutcome.cashLine)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Risk multiplier</p>
                  <p className="mt-2 text-xl text-white">x{(projectedOutcome.multiplier / 10000).toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-white/62">Fix the forecast total first to unlock the payout projection.</p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/70">
            <p className="inline-flex items-center gap-2 text-fault-signal">
              <Flame className="size-4" />
              Read recap before signature.
            </p>
            <p className="mt-3 text-white/82">Zone {ZONE_LABELS[zone]} with {RISK_LABELS[riskBand]} on forecast [{forecast.join(", ")}]</p>
            {projectedOutcome ? (
              <p className="mt-3 text-white/68">
                Your chosen lane carries {projectedOutcome.zoneLoad} predicted players while the cleanest lane in this forecast sits at {projectedOutcome.cleanestLoad}. This is a conviction bet, not a random entry.
              </p>
            ) : null}
          </div>
        </div>

        <TransactionSpeedControl value={transactionSpeed} onChange={setTransactionSpeed} />

        <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/70">
          <p className="inline-flex items-center gap-2 text-fault-flare">
            <ShieldAlert className="size-4" />
            The nonce and clear payload are stored locally before send. Lose this browser state and your manual reveal path is gone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="arena-chip" data-tone="signal">Local vault active</span>
            <span className="arena-chip" data-tone={relayRecoveryStatus.configured ? "signal" : "ember"}>
              {relayRecoveryStatus.checking
                ? "Checking relay recovery"
                : relayRecoveryStatus.configured
                  ? `Relay recovery available for ${relayRecoveryStatus.ttlDays} days`
                  : "Relay recovery unavailable on this deployment"}
            </span>
            <span className="arena-chip" data-tone={hasPortableRecoveryPath ? "flare" : "ember"}>
              {hasPortableRecoveryPath ? "Portable recovery armed" : "Portable recovery missing"}
            </span>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-white/78">
            <input
              type="checkbox"
              checked={downloadBackup}
              onChange={(event) => setDownloadBackup(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#ffd166]"
            />
            Download a recovery file after the commit confirms.
          </label>
          <label className="mt-3 flex items-start gap-3 text-sm text-white/78">
            <input
              type="checkbox"
              checked={storeRelayRecovery}
              onChange={(event) => setStoreRelayRecovery(event.target.checked)}
              disabled={!relayRecoveryStatus.configured}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#7df9ff]"
            />
            <span>
              Mirror this reveal payload to the automation relay for 7-day cross-device recovery.
              <span className="mt-1 block text-white/52">
                {relayRecoveryStatus.checking
                  ? "Checking whether the relay mirror is available for this deployment."
                  : relayRecoveryStatus.configured
                    ? "Opt-in only: this stores the clear reveal payload server-side so the relay can auto-reveal or preserve cross-device recoverability."
                    : relayRecoveryStatus.error ?? "Relay recovery is not configured here, so only local storage and exported files can protect manual reveal."}
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void submitCommit()}
          disabled={pending}
          className="arena-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {isJoined ? "Lock prediction" : "Enter and lock read"}
        </button>
      </div>
    </div>
  );
}
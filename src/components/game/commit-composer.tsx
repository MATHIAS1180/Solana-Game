"use client";

import { useMemo, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { LoaderCircle, Lock, ShieldAlert } from "lucide-react";

import { useToast } from "@/components/ui/toast-provider";
import { FAULTLINE_COMMIT_VERSION, PLAYER_STATUS, RISK_LABELS, ROOM_STATUS, ZONE_LABELS } from "@/lib/faultline/constants";
import { buildCommitHash, generateNonce, validateForecast } from "@/lib/faultline/commit";
import { createCancelExpiredRoomIx, createInitRoomIx, createJoinAndCommitIx, createSubmitCommitIx } from "@/lib/faultline/instructions";
import { fetchRoom, findPlayerIndex } from "@/lib/faultline/rooms";
import { persistCommitPayload } from "@/lib/faultline/storage";
import type { FaultlineRoomAccount, Forecast, RiskBand, StoredCommitPayload, Zone } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm } from "@/lib/solana/transactions";
import { shortKey } from "@/lib/utils";

function getDefaultForecast(room: FaultlineRoomAccount): Forecast {
  const base = Math.floor(room.minPlayers / 5);
  const histogram: Forecast = [base, base, base, base, base];
  for (let index = 0; index < room.minPlayers - base * 5; index += 1) {
    histogram[index] += 1;
  }
  return histogram;
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
  const isJoined = playerIndex >= 0;

  const validation = useMemo(() => validateForecast(forecast, room.minPlayers, room.maxPlayers), [forecast, room.maxPlayers, room.minPlayers]);

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

      await sendAndConfirm(connection, sendTransaction, publicKey, transaction);

      let relayBackupStored = false;
      if (storeRelayRecovery) {
        try {
          await storeRelayBackup(storedPayload);
          relayBackupStored = true;
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
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/70">
          <p className="inline-flex items-center gap-2 text-fault-flare">
            <ShieldAlert className="size-4" />
            The nonce and clear payload are stored locally before send. Lose this browser state and your manual reveal path is gone.
          </p>
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
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#7df9ff]"
            />
            <span>
              Mirror this reveal payload to the automation relay for 7-day cross-device recovery.
              <span className="mt-1 block text-white/52">Opt-in only: this stores the clear reveal payload server-side so the relay can auto-reveal or help you recover on another device.</span>
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
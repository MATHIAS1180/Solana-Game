"use client";

import { useMemo, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { LoaderCircle, Lock, ShieldAlert } from "lucide-react";

import { PLAYER_STATUS, RISK_LABELS, ROOM_STATUS, ZONE_LABELS } from "@/lib/faultline/constants";
import { buildCommitHash, generateNonce, validateForecast } from "@/lib/faultline/commit";
import { createCancelExpiredRoomIx, createInitRoomIx, createJoinAndCommitIx, createSubmitCommitIx } from "@/lib/faultline/instructions";
import { deriveProfilePda } from "@/lib/faultline/pdas";
import { fetchRoom, findPlayerIndex } from "@/lib/faultline/rooms";
import { persistCommitPayload } from "@/lib/faultline/storage";
import type { FaultlineRoomAccount, Forecast, RiskBand, Zone } from "@/lib/faultline/types";
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
  const [zone, setZone] = useState<Zone>(0);
  const [riskBand, setRiskBand] = useState<RiskBand>(0);
  const [forecast, setForecast] = useState<Forecast>(() => getDefaultForecast(room));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
      setMessage("Wallet non connecte ou Program ID absent.");
      return;
    }

    if (!validation.valid) {
      setMessage("Le forecast doit totaliser un nombre compris entre le min et le max de la room.");
      return;
    }

    try {
      setPending(true);
      setMessage(null);

      const [latestRoom, currentSlot] = await Promise.all([fetchRoom(connection, room.publicKey), connection.getSlot("confirmed")]);
      const latestPlayerIndex = latestRoom ? findPlayerIndex(latestRoom, publicKey) : -1;
      const targetPresetId = latestRoom?.presetId ?? presetId;
      const needsResetBeforeJoin = latestRoom ? isExpiredUnderMinPlayers(latestRoom, currentSlot) : false;

      if (!latestRoom && targetPresetId === null) {
        throw new Error("La room n'existe pas encore on-chain et aucun preset systeme n'est associe a cette page.");
      }

      if (latestRoom && latestPlayerIndex === -1 && !needsResetBeforeJoin) {
        const joinDeadlineClosed = latestRoom.playerCount > 0 && Number(latestRoom.joinDeadlineSlot) > 0 && currentSlot > Number(latestRoom.joinDeadlineSlot);
        if (latestRoom.status !== ROOM_STATUS.Open || joinDeadlineClosed || latestRoom.playerCount >= latestRoom.maxPlayers) {
          throw new Error("La room n'est plus joignable. Rafraichis la page pour recuperer une room active.");
        }
      }

      if (latestRoom && latestPlayerIndex !== -1 && latestRoom.playerStatuses[latestPlayerIndex] !== PLAYER_STATUS.Joined) {
        throw new Error("Cette participation n'attend plus de commit. Rafraichis la page.");
      }

      const nonce = generateNonce();
      const targetRoomKey = latestRoom?.publicKey ?? room.publicKey;
      const payload = {
        room: targetRoomKey,
        player: publicKey,
        zone,
        riskBand,
        forecast,
        nonce
      };
      const commitHash = buildCommitHash(payload);

      const storedPayload = {
        room: targetRoomKey.toBase58(),
        player: publicKey.toBase58(),
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
            presetId: targetPresetId!
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
        const [profile] = await deriveProfilePda(programId, publicKey);
        transaction.add(
          createSubmitCommitIx({
            programId,
            player: publicKey,
            room: latestRoom.publicKey,
            profile,
            commitHash
          })
        );
      }

      await sendAndConfirm(connection, sendTransaction, publicKey, transaction);
      setMessage(
        `${!latestRoom ? "Creation + join + commit confirmes" : latestPlayerIndex === -1 ? "Join + commit confirmes" : "Commit verrouille"} pour ${shortKey(room.publicKey)}. Le payload est garde localement pour le reveal manuel.`
      );
      await onCommitted();
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.includes("Database")
          ? "IndexedDB indisponible: reveal impossible plus tard. Active le stockage local avant de commit."
          : error instanceof Error
            ? error.message
            : "Commit echoue."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fault-card rounded-[1.75rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Commit Composer</p>
          <h2 className="mt-3 font-display text-2xl text-white">Verrouiller ta lecture de foule</h2>
        </div>
        <Lock className="size-5 text-fault-flare" />
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-sm text-white/70">Zone</p>
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
          <p className="text-sm text-white/70">Risk Band</p>
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
                  {index === 0 ? "Toujours valide" : index === 1 ? "Top 2 least crowded" : "Minimum absolu"}
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
            Le nonce et le payload en clair sont stockes localement avant envoi. Sans ce stockage, le reveal sera impossible.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void submitCommit()}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-fault-ember px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-fault-basalt disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {isJoined ? "Soumettre le commit" : "Join + Commit"}
        </button>

        {message ? <p className="text-sm text-white/72">{message}</p> : null}
      </div>
    </div>
  );
}
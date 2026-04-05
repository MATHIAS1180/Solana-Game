"use client";

import Link from "next/link";
import { useState } from "react";

import { useRouter } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { ArrowRight, LoaderCircle, Users } from "lucide-react";

import { PhaseBadge } from "@/components/game/phase-badge";
import { ROOM_STATUS } from "@/lib/faultline/constants";
import { createCancelExpiredRoomIx, createInitRoomIx, createJoinRoomIx } from "@/lib/faultline/instructions";
import { deriveRoomPda } from "@/lib/faultline/pdas";
import type { FaultlineRoomAccount, RoomPreset } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm } from "@/lib/solana/transactions";
import { formatCountdown, formatLamports, shortKey } from "@/lib/utils";

export function RoomCard({
  room,
  preset,
  currentSlot,
  onRefresh
}: {
  room: FaultlineRoomAccount | null;
  preset: RoomPreset;
  currentSlot: number;
  onRefresh: () => Promise<void>;
}) {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const programId = getFaultlineProgramId();
  const [pending, setPending] = useState<"create" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const joinRemaining = room ? Number(room.joinDeadlineSlot) - currentSlot : 0;
  const commitRemaining = room ? Number(room.commitDeadlineSlot) - currentSlot : 0;
  const revealRemaining = room ? Number(room.revealDeadlineSlot) - currentSlot : 0;
  const canCancelExpiredRoom =
    !!room && room.status === ROOM_STATUS.Open && room.playerCount > 0 && Number(room.joinDeadlineSlot) > 0 && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers;
  const canJoinRoom =
    !!room &&
    room.status === ROOM_STATUS.Open &&
    room.playerCount < room.maxPlayers &&
    (room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 || currentSlot <= Number(room.joinDeadlineSlot));

  const deadlineLabel =
    !room || room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0
      ? "demarre au prochain joueur"
      : canCancelExpiredRoom
        ? "annulation requise"
        : room.status === ROOM_STATUS.Open
          ? formatCountdown(joinRemaining)
          : room.status === ROOM_STATUS.Commit
            ? formatCountdown(commitRemaining)
            : formatCountdown(revealRemaining);

  async function createAndJoinPresetRoom() {
    try {
      setPending("create");
      setMessage(null);

      if (!publicKey || !sendTransaction || !programId) {
        throw new Error("Connecte ton wallet avant d'ouvrir cette room.");
      }

      const [roomPda] = await deriveRoomPda(programId, preset.id);
      const transaction = new Transaction();
      transaction.add(
        await createInitRoomIx({
          programId,
          creator: publicKey,
          stakeLamports: preset.stakeLamports,
          minPlayers: preset.minPlayers,
          maxPlayers: preset.maxPlayers,
          joinWindowSlots: preset.joinWindowSlots,
          commitWindowSlots: preset.commitWindowSlots,
          revealWindowSlots: preset.revealWindowSlots,
          presetId: preset.id
        })
      );
      transaction.add(
        await createJoinRoomIx({
          programId,
          player: publicKey,
          room: roomPda
        })
      );

      await sendAndConfirm(connection, sendTransaction, publicKey, transaction);
      router.push(`/rooms/${roomPda.toBase58()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'ouvrir la room.");
    } finally {
      setPending(null);
    }
  }

  async function cancelExpiredRoom() {
    try {
      setPending("cancel");
      setMessage(null);

      if (!room) {
        return;
      }

      if (!publicKey || !sendTransaction || !programId) {
        throw new Error("Connecte ton wallet avant d'annuler cette room.");
      }

      const transaction = new Transaction().add(
        await createCancelExpiredRoomIx({
          programId,
          caller: publicKey,
          room: room.publicKey
        })
      );

      await sendAndConfirm(connection, sendTransaction, publicKey, transaction);
      await onRefresh();
      setMessage("La partie precedente a ete annulee. Le preset est de nouveau libre.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Annulation impossible.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="fault-card group rounded-[1.75rem] p-6 transition hover:translate-y-[-2px] hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">{room ? shortKey(room.publicKey, 6) : "preset permanent"}</p>
          <h3 className="mt-3 font-display text-2xl text-white">{preset.name}</h3>
          <p className="mt-2 text-sm text-white/62">{preset.minPlayers}-{preset.maxPlayers} joueurs</p>
        </div>
        {room && !canCancelExpiredRoom ? (
          <PhaseBadge status={room.status} />
        ) : (
          <div className="rounded-full border border-white/12 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/72">
            {canCancelExpiredRoom ? "A annuler" : "En attente"}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-white/72">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Stake</p>
          <p className="mt-2 text-lg text-white">{formatLamports(BigInt(preset.stakeLamports))}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Chrono</p>
          <p className="mt-2 text-lg text-white">{deadlineLabel}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/62">
        {room
          ? canCancelExpiredRoom
            ? "La derniere partie de ce preset n'a pas atteint le minimum de joueurs. Annule-la pour rembourser les participants et liberer le lobby."
            : room.playerCount === 0
              ? "Cette room persistante est prete. Le prochain joueur relance le decompte et prend la premiere place."
            : canJoinRoom
              ? "Une partie est ouverte sur ce preset. Le chrono tourne deja et tu peux encore la rejoindre."
              : "Une partie existe deja sur ce preset. Ouvre-la pour suivre la phase courante ou jouer tes actions permissionless."
          : "Aucune partie active. Le premier joueur initialise la room on-chain si besoin, puis lance le decompte."}
      </p>

      <div className="mt-6 flex items-center justify-between text-sm text-white/70">
        <span className="inline-flex items-center gap-2">
          <Users className="size-4 text-fault-flare" />
          {room?.playerCount ?? 0} / {preset.maxPlayers}
        </span>
        {room && !canCancelExpiredRoom ? (
          <Link href={`/rooms/${room.publicKey.toBase58()}`} className="inline-flex items-center gap-2 text-white transition group-hover:text-fault-flare">
            {canJoinRoom ? "Rejoindre" : "Ouvrir"}
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void (canCancelExpiredRoom ? cancelExpiredRoom() : createAndJoinPresetRoom())}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-2 font-display text-xs uppercase tracking-[0.22em] text-fault-flare transition hover:border-fault-flare hover:bg-fault-flare/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {canCancelExpiredRoom ? "Annuler la partie" : "Ouvrir et rejoindre"}
          </button>
        )}
      </div>

      {message ? <p className="mt-4 text-sm text-fault-flare">{message}</p> : null}
    </div>
  );
}
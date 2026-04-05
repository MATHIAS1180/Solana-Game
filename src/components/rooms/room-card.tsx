"use client";

import Link from "next/link";
import { useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Users } from "lucide-react";

import { PhaseBadge } from "@/components/game/phase-badge";
import { ROOM_STATUS } from "@/lib/faultline/constants";
import { deriveRoomPda } from "@/lib/faultline/pdas";
import type { FaultlineRoomAccount, RoomPreset } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { formatCountdown, formatLamports, shortKey } from "@/lib/utils";

export function RoomCard({
  room,
  preset,
  currentSlot
}: {
  room: FaultlineRoomAccount | null;
  preset: RoomPreset;
  currentSlot: number;
}) {
  const router = useRouter();
  const programId = getFaultlineProgramId();
  const [pending, setPending] = useState(false);
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

  async function openRoom() {
    try {
      setPending(true);
      setMessage(null);

      if (room) {
        router.push(`/rooms/${room.publicKey.toBase58()}`);
        return;
      }

      if (!programId) {
        throw new Error("Program ID absent.");
      }

      const [roomPda] = await deriveRoomPda(programId, preset.id);
      router.push(`/rooms/${roomPda.toBase58()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'ouvrir la room.");
    } finally {
      setPending(false);
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
            ? "La derniere partie de ce preset n'a pas atteint le minimum de joueurs. Ouvre la room: la prochaine transaction de jeu peut refund, reset puis entrer dans le lobby en un seul envoi."
            : room.playerCount === 0
              ? "Cette room persistante est prete. Le prochain joueur relance le decompte et prend la premiere place."
            : canJoinRoom
              ? "Une partie est ouverte sur ce preset. Ouvre la room pour entrer avec ton commit directement dans la meme transaction."
              : "Une partie existe deja sur ce preset. Ouvre-la pour suivre la phase courante ou jouer tes actions permissionless."
          : "Aucune partie active. Ouvre la room: la premiere transaction de jeu l'initialise si besoin, puis join et commit en une seule fois."}
      </p>

      <div className="mt-6 flex items-center justify-between text-sm text-white/70">
        <span className="inline-flex items-center gap-2">
          <Users className="size-4 text-fault-flare" />
          {room?.playerCount ?? 0} / {preset.maxPlayers}
        </span>
        {room ? (
          <Link href={`/rooms/${room.publicKey.toBase58()}`} className="inline-flex items-center gap-2 text-white transition group-hover:text-fault-flare">
            {canJoinRoom ? "Entrer" : "Ouvrir"}
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void openRoom()}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-2 font-display text-xs uppercase tracking-[0.22em] text-fault-flare transition hover:border-fault-flare hover:bg-fault-flare/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Ouvrir la room
          </button>
        )}
      </div>

      {message ? <p className="mt-4 text-sm text-fault-flare">{message}</p> : null}
    </div>
  );
}
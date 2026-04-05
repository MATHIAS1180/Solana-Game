"use client";

import Link from "next/link";
import { useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Radio, Users } from "lucide-react";

import { PhaseBadge } from "@/components/game/phase-badge";
import { useToast } from "@/components/ui/toast-provider";
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
  const toast = useToast();
  const [pending, setPending] = useState(false);

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
      ? "starts with the next wallet"
      : canCancelExpiredRoom
        ? "reset required"
        : room.status === ROOM_STATUS.Open
          ? formatCountdown(joinRemaining)
          : room.status === ROOM_STATUS.Commit
            ? formatCountdown(commitRemaining)
            : formatCountdown(revealRemaining);

  async function openRoom() {
    try {
      setPending(true);

      if (room) {
        router.push(`/rooms/${room.publicKey.toBase58()}`);
        return;
      }

      if (!programId) {
        throw new Error("Program ID is missing.");
      }

      const [roomPda] = await deriveRoomPda(programId, preset.id);
      router.push(`/rooms/${roomPda.toBase58()}`);
    } catch (error) {
      toast({
        tone: "error",
        title: "Unable to open room",
        description: error instanceof Error ? error.message : "The room route could not be resolved."
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fault-card group rounded-[1.75rem] p-6 transition hover:translate-y-[-2px] hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">{room ? shortKey(room.publicKey, 6) : "persistent preset"}</p>
          <h3 className="mt-3 font-display text-2xl text-white">{preset.name}</h3>
          <p className="mt-2 text-sm text-white/62">{preset.description}</p>
        </div>
        {room && !canCancelExpiredRoom ? (
          <PhaseBadge status={room.status} />
        ) : (
          <div className="rounded-full border border-white/12 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/72">
            {canCancelExpiredRoom ? "Needs reset" : "Standby"}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-white/72">
        <div className="arena-stat rounded-2xl p-4">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Stake</p>
          <p className="mt-2 text-lg text-white">{formatLamports(BigInt(preset.stakeLamports))}</p>
        </div>
        <div className="arena-stat rounded-2xl p-4">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Window</p>
          <p className="mt-2 text-lg text-white">{deadlineLabel}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/46">
        <Radio className="size-4 text-fault-signal" />
        {room ? `Commit ${room.committedCount}/${room.playerCount} | Reveal ${room.revealedCount}/${room.committedCount}` : "The first entrant initializes the room account"}
      </div>

      <p className="mt-4 text-sm text-white/62">
        {room
          ? canCancelExpiredRoom
            ? "The previous round failed to hit minimum participation. Opening the room lets the next game transaction refund players, reset the state, and enter the lobby in one signed flow."
            : room.playerCount === 0
              ? "This persistent room is armed and empty. The next player restarts the join timer and takes the first seat."
            : canJoinRoom
              ? "A live round is accepting entries. Open the room to choose your forecast and lock your commit in the same wallet action."
              : "A round already exists on this preset. Open it to spectate the phase, reveal your play, or trigger permissionless actions."
          : "No active round exists yet. Open the route and the first gameplay transaction will initialize the room if required, then join and commit in one step."}
      </p>

      <div className="mt-6 flex items-center justify-between text-sm text-white/70">
        <span className="inline-flex items-center gap-2">
          <Users className="size-4 text-fault-flare" />
          {room?.playerCount ?? 0} / {preset.maxPlayers}
        </span>
        {room ? (
          <Link href={`/rooms/${room.publicKey.toBase58()}`} className="inline-flex items-center gap-2 text-white transition group-hover:text-fault-flare">
            {canJoinRoom ? "Enter arena" : "View room"}
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void openRoom()}
            disabled={pending}
            className="arena-primary inline-flex items-center gap-2 px-4 py-2 font-display text-xs uppercase tracking-[0.22em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Open room
          </button>
        )}
      </div>
    </div>
  );
}
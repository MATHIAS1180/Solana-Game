"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Radio, Users } from "lucide-react";

import { PhaseBadge } from "@/components/game/phase-badge";
import { Countdown } from "@/components/ui/countdown";
import { useToast } from "@/components/ui/toast-provider";
import { ROOM_STATUS } from "@/lib/faultline/constants";
import { deriveRoomPda } from "@/lib/faultline/pdas";
import type { FaultlineRoomAccount, RoomPreset } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { cn, formatCountdown, formatLamports, shortKey } from "@/lib/utils";

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
  const occupancyRatio = room ? Math.max(0, Math.min(100, (room.playerCount / room.maxPlayers) * 100)) : 0;
  const seatsLeft = room ? Math.max(room.maxPlayers - room.playerCount, 0) : preset.maxPlayers;
  const currentPoolLamports = room ? room.totalStakedLamports : BigInt(preset.stakeLamports) * BigInt(preset.minPlayers);
  const topShareLamports = room
    ? room.distributableLamports / BigInt(Math.max(room.winnerCount, 1))
    : BigInt(preset.stakeLamports) * BigInt(preset.minPlayers);
  const momentumLabel =
    !room || room.playerCount === 0
      ? "fresh lobby"
      : canJoinRoom
        ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`
        : room.status === ROOM_STATUS.Commit
          ? "commits are live"
          : "reveal pressure building";
  const pressureTone = !room || room.playerCount === 0 ? "signal" : canJoinRoom ? "flare" : room.status === ROOM_STATUS.Reveal ? "ember" : "signal";
  const actionLabel = !room ? "Open room" : canJoinRoom ? "Take seat" : room.status === ROOM_STATUS.Commit ? "Watch commit" : room.status === ROOM_STATUS.Reveal ? "Watch reveal" : "View room";
  const pressureCopy =
    !room || room.playerCount === 0
      ? "Fresh lane. The next wallet decides when public pressure starts."
      : canCancelExpiredRoom
        ? "Reset pressure is live. The next actor can clear the failed round and reopen the lane."
        : canJoinRoom
          ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} remain before this lane gets meaningfully crowded.`
          : room.status === ROOM_STATUS.Commit
            ? `${room.committedCount} private read${room.committedCount === 1 ? " is" : "s are"} already locked. Late entry is gone; only pressure remains.`
            : `The room is now revealing its real shape. Spectators can still read the pressure and wait for resolution.`;
  const urgencyLabel =
    !room || room.playerCount === 0
      ? "first seat decides the tempo"
      : canCancelExpiredRoom
        ? "reset this lane to reopen entry"
        : canJoinRoom && seatsLeft <= 2
          ? `critical entry: ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`
          : room.status === ROOM_STATUS.Commit
            ? `${room.committedCount} read${room.committedCount === 1 ? "" : "s"} already sealed`
            : room.status === ROOM_STATUS.Reveal
              ? `${room.revealedCount}/${room.committedCount} reveals already public`
              : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} still open`;
  let deadlineDisplay: ReactNode = deadlineLabel;

  if (room && !canCancelExpiredRoom) {
    if (room.status === ROOM_STATUS.Open && room.playerCount > 0 && Number(room.joinDeadlineSlot) > 0) {
      deadlineDisplay = <Countdown targetSlot={Number(room.joinDeadlineSlot)} currentSlot={currentSlot} urgencyAt={75} />;
    } else if (room.status === ROOM_STATUS.Commit && Number(room.commitDeadlineSlot) > 0) {
      deadlineDisplay = <Countdown targetSlot={Number(room.commitDeadlineSlot)} currentSlot={currentSlot} urgencyAt={75} />;
    } else if (room.status === ROOM_STATUS.Reveal && Number(room.revealDeadlineSlot) > 0) {
      deadlineDisplay = <Countdown targetSlot={Number(room.revealDeadlineSlot)} currentSlot={currentSlot} urgencyAt={75} />;
    }
  }

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
    <div className="fault-card arena-ticket-card group rounded-[1.75rem] p-6 transition hover:translate-y-[-2px] hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">{room ? shortKey(room.publicKey, 6) : "persistent preset"}</p>
          <h3 className="mt-3 font-display text-2xl text-white">{preset.name}</h3>
          <p className="mt-2 text-sm text-white/62">{preset.description}</p>
        </div>
        {room && !canCancelExpiredRoom ? (
          <PhaseBadge status={room.status} detail={momentumLabel} compact />
        ) : (
          <div className="rounded-full border border-white/12 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/72">
            {canCancelExpiredRoom ? "Needs reset" : "Standby"}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div>
            <p className="font-mono uppercase tracking-[0.22em] text-white/45">Stake</p>
            <p className="mt-2 font-display text-4xl text-white">{formatLamports(BigInt(preset.stakeLamports))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="arena-chip" data-tone={pressureTone}>{momentumLabel}</span>
            <span className="arena-chip">{room?.playerCount ?? 0}/{preset.maxPlayers} seated</span>
            {room ? <span className="arena-chip">Window {deadlineDisplay}</span> : <span className="arena-chip">Waiting first seat</span>}
          </div>
        </div>

        <div className="arena-ticket-divider grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/72">
            <p className="font-mono uppercase tracking-[0.22em] text-white/45">Pool</p>
            <p className="mt-2 text-lg text-white">{formatLamports(currentPoolLamports)}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/72">
            <p className="font-mono uppercase tracking-[0.22em] text-white/45">Top share</p>
            <p className="mt-2 text-lg text-white">{formatLamports(topShareLamports)}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/72">
            <p className="font-mono uppercase tracking-[0.22em] text-white/45">Status</p>
            <p className="mt-2 text-lg text-white">{room ? `${room.committedCount}/${room.playerCount}` : "Standby"}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/46">
        <Radio className="size-4 text-fault-signal" />
        {room ? `Commit ${room.committedCount}/${room.playerCount} | Reveal ${room.revealedCount}/${room.committedCount}` : "The first entrant initializes the room account"}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/45">
          <span>Lane pressure</span>
          <span>{urgencyLabel}</span>
        </div>
        <div className="arena-meter h-2">
          <span style={{ width: `${occupancyRatio}%` }} />
        </div>
      </div>

      <p className="mt-4 text-sm text-white/62">{pressureCopy}</p>

      <div className="mt-6 flex flex-col gap-4 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <Users className="size-4 text-fault-flare" />
          {room?.playerCount ?? 0} / {preset.maxPlayers}
        </span>
        {room ? (
          <Link
            href={`/rooms/${room.publicKey.toBase58()}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
              canJoinRoom ? "arena-primary" : "arena-secondary"
            )}
          >
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void openRoom()}
            disabled={pending}
            className="arena-primary inline-flex w-full items-center gap-2 px-4 py-2 font-display text-xs uppercase tracking-[0.22em] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
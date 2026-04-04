import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

import { PhaseBadge } from "@/components/game/phase-badge";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { formatCountdown, formatLamports, shortKey } from "@/lib/utils";

export function RoomCard({ room, currentSlot }: { room: FaultlineRoomAccount; currentSlot: number }) {
  const joinRemaining = Number(room.joinDeadlineSlot) - currentSlot;
  const commitRemaining = Number(room.commitDeadlineSlot) - currentSlot;
  const revealRemaining = Number(room.revealDeadlineSlot) - currentSlot;

  const deadlineLabel =
    room.status === 0 ? formatCountdown(joinRemaining) : room.status === 1 ? formatCountdown(commitRemaining) : formatCountdown(revealRemaining);

  return (
    <Link href={`/rooms/${room.publicKey.toBase58()}`} className="fault-card group rounded-[1.75rem] p-6 transition hover:translate-y-[-2px] hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">{shortKey(room.publicKey, 6)}</p>
          <h3 className="mt-3 font-display text-2xl text-white">{room.minPlayers}-{room.maxPlayers} joueurs</h3>
        </div>
        <PhaseBadge status={room.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-white/72">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Stake</p>
          <p className="mt-2 text-lg text-white">{formatLamports(room.stakeLamports)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Deadline</p>
          <p className="mt-2 text-lg text-white">{deadlineLabel}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-white/70">
        <span className="inline-flex items-center gap-2">
          <Users className="size-4 text-fault-flare" />
          {room.playerCount} / {room.maxPlayers}
        </span>
        <span className="inline-flex items-center gap-2 text-white transition group-hover:text-fault-flare">
          Ouvrir
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { Clock3, Users } from "lucide-react";

import { PhaseBadge } from "@/components/game/phase-badge";
import { ProgramBanner } from "@/components/game/program-banner";
import { ResultPanel } from "@/components/game/result-panel";
import { RoomActions } from "@/components/game/room-actions";
import { AUTOMATION_HEARTBEAT_INTERVAL_MS } from "@/lib/faultline/constants";
import { PLAYER_STATUS_LABELS, RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { findPlayerIndex } from "@/lib/faultline/rooms";
import { deserializeRoomAccount, type SerializedFaultlineRoomAccount } from "@/lib/faultline/transport";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { formatLamports, shortKey } from "@/lib/utils";

export function RoomPage({ roomAddress }: { roomAddress: string }) {
  const { publicKey } = useWallet();
  const [room, setRoom] = useState<FaultlineRoomAccount | null>(null);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function refreshRoom() {
    try {
      const response = await fetch(`/api/rooms/${roomAddress}`, { cache: "no-store" });
      const payload = (await response.json()) as { ok: boolean; error?: string; currentSlot?: number; room?: SerializedFaultlineRoomAccount };

      if (!response.ok || !payload.ok || !payload.room || payload.currentSlot === undefined) {
        throw new Error(payload.error || "Lecture de room impossible.");
      }

      setCurrentSlot(payload.currentSlot);
      setRoom(deserializeRoomAccount(payload.room));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Lecture de room impossible.");
    }
  }

  useEffect(() => {
    void refreshRoom();
    const interval = window.setInterval(() => {
      void refreshRoom();
    }, AUTOMATION_HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [roomAddress]);

  if (error) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:px-10 lg:px-12">
        <ProgramBanner />
        <div className="fault-card mt-8 rounded-[1.75rem] p-8 text-fault-flare">{error}</div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:px-10 lg:px-12">
        <ProgramBanner />
        <div className="fault-card mt-8 h-80 animate-pulse rounded-[1.75rem] bg-white/5" />
      </main>
    );
  }

  const playerIndex = publicKey ? findPlayerIndex(room, publicKey) : -1;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Room Detail</p>
            <h1 className="mt-3 font-display text-4xl text-white">Faultline room {shortKey(room.publicKey, 6)}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
              Room systeme sur Solana devnet. La progression est prise en charge automatiquement par le relayer des que des visiteurs sont presents dans l'app.
            </p>
          </div>
          <PhaseBadge status={room.status} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(room.stakeLamports)}</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Players</p>
            <p className="mt-3 inline-flex items-center gap-2 text-2xl text-white">
              <Users className="size-5 text-fault-flare" />
              {room.playerCount} / {room.maxPlayers}
            </p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commits / Reveals</p>
            <p className="mt-3 text-2xl text-white">{room.committedCount} / {room.revealedCount}</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Current slot</p>
            <p className="mt-3 inline-flex items-center gap-2 text-2xl text-white">
              <Clock3 className="size-5 text-fault-flare" />
              {currentSlot}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <RoomActions room={room} currentSlot={currentSlot} playerIndex={playerIndex} onRefresh={refreshRoom} />

        <div className="space-y-6">
          <div className="fault-card rounded-[1.75rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Spectator Board</p>
            <h2 className="mt-3 font-display text-2xl text-white">Etat des participants</h2>
            <div className="mt-6 space-y-3">
              {Array.from({ length: room.playerCount }, (_, index) => (
                <div key={room.playerKeys[index].toBase58()} className="grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[0.34fr_0.18fr_0.18fr_0.3fr] md:items-center">
                  <p className="text-sm text-white">{shortKey(room.playerKeys[index], 6)}</p>
                  <p className="text-sm text-white/70">{PLAYER_STATUS_LABELS[room.playerStatuses[index]]}</p>
                  <p className="text-sm text-white/70">{room.playerStatuses[index] === 3 ? `Zone ${ZONE_LABELS[room.playerZones[index]]}` : "opaque"}</p>
                  <p className="text-sm text-white/70">{room.playerStatuses[index] === 3 ? RISK_LABELS[room.playerRisks[index]] : "en attente de reveal"}</p>
                </div>
              ))}
            </div>
          </div>

          <ResultPanel room={room} playerIndex={playerIndex} />
        </div>
      </section>
    </main>
  );
}
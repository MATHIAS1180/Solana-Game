"use client";

import { useEffect, useState } from "react";

import { RefreshCw } from "lucide-react";

import { ProgramBanner } from "@/components/game/program-banner";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { RoomCard } from "@/components/rooms/room-card";
import { AUTOMATION_HEARTBEAT_INTERVAL_MS } from "@/lib/faultline/constants";
import { deserializeRoomAccount, type SerializedFaultlineRoomAccount } from "@/lib/faultline/transport";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";

type RoomsPageProps = {
  initialRooms?: SerializedFaultlineRoomAccount[];
  initialCurrentSlot?: number;
  initialError?: string | null;
};

export function RoomsPage({ initialRooms, initialCurrentSlot = 0, initialError = null }: RoomsPageProps) {
  const [rooms, setRooms] = useState<FaultlineRoomAccount[]>(() => initialRooms?.map(deserializeRoomAccount) ?? []);
  const [currentSlot, setCurrentSlot] = useState(initialCurrentSlot);
  const [loading, setLoading] = useState(!initialRooms && !initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function refreshRooms() {
    try {
      if (rooms.length === 0) {
        setLoading(true);
      }
      setRefreshing(true);
      setError(null);
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const payload = (await response.json()) as { ok: boolean; error?: string; currentSlot?: number; rooms?: SerializedFaultlineRoomAccount[] };

      if (!response.ok || !payload.ok || !payload.rooms || payload.currentSlot === undefined) {
        throw new Error(payload.error || "Chargement des rooms echoue.");
      }

      setCurrentSlot(payload.currentSlot);
      setRooms(payload.rooms.map(deserializeRoomAccount));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Chargement des rooms echoue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshRooms();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshRooms();
    }, AUTOMATION_HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <CreateRoomForm />

        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Room Discovery</p>
              <h1 className="mt-3 font-display text-4xl text-white">Toutes les rooms Faultline detectees sur devnet</h1>
            </div>
            <button
              type="button"
              onClick={() => void refreshRooms()}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white/72 transition hover:border-white/30 hover:bg-white/5"
            >
              <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
              Rafraichir
            </button>
          </div>

          {error ? <div className="fault-card rounded-3xl p-5 text-sm text-fault-flare">{error}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="fault-card h-64 animate-pulse rounded-[1.75rem] bg-white/5" />
              ))
            ) : rooms.length > 0 ? (
              rooms.map((room) => <RoomCard key={room.publicKey.toBase58()} room={room} currentSlot={currentSlot} />)
            ) : (
              <div className="fault-card rounded-[1.75rem] p-8 text-sm leading-7 text-white/70">
                Aucune partie active pour l'instant. Utilise les presets a gauche pour ouvrir une room on-chain au moment ou un joueur entre.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
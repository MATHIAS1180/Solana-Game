"use client";

import { useEffect, useRef, useState } from "react";

import { useConnection } from "@solana/wallet-adapter-react";

import { RefreshCw } from "lucide-react";

import { ProgramBanner } from "@/components/game/program-banner";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { RoomCard } from "@/components/rooms/room-card";
import { AUTOMATION_HEARTBEAT_INTERVAL_MS, DEFAULT_ROOM_PRESETS, ROOM_STATE_SIZE } from "@/lib/faultline/constants";
import { deserializeRoomAccount, type SerializedFaultlineRoomAccount } from "@/lib/faultline/transport";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";

type RoomsPageProps = {
  initialRooms?: SerializedFaultlineRoomAccount[];
  initialCurrentSlot?: number;
  initialError?: string | null;
};

export function RoomsPage({ initialRooms, initialCurrentSlot = 0, initialError = null }: RoomsPageProps) {
  const { connection } = useConnection();
  const programId = getFaultlineProgramId();
  const [rooms, setRooms] = useState<FaultlineRoomAccount[]>(() => initialRooms?.map(deserializeRoomAccount) ?? []);
  const [currentSlot, setCurrentSlot] = useState(initialCurrentSlot);
  const [loading, setLoading] = useState(!initialRooms && !initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const refreshInFlightRef = useRef(false);

  async function refreshRooms() {
    if (refreshInFlightRef.current) {
      return;
    }

    try {
      refreshInFlightRef.current = true;
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
      refreshInFlightRef.current = false;
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

  useEffect(() => {
    if (!programId) {
      return;
    }

    const programSubId = connection.onProgramAccountChange(
      programId,
      () => {
        void refreshRooms();
      },
      "confirmed",
      [{ dataSize: ROOM_STATE_SIZE }]
    );

    const slotSubId = connection.onSlotChange((update) => {
      setCurrentSlot(update.slot);
    });

    return () => {
      void connection.removeProgramAccountChangeListener(programSubId);
      void connection.removeSlotChangeListener(slotSubId);
    };
  }, [connection, programId]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <CreateRoomForm />

        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Permanent Presets</p>
              <h1 className="mt-3 font-display text-4xl text-white">Les rooms 0.01 a 1 SOL restent toujours visibles</h1>
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
            {DEFAULT_ROOM_PRESETS.map((preset) => {
              const room = rooms.find((item) => item.presetId === preset.id) ?? null;

              return <RoomCard key={preset.id} preset={preset} room={room} currentSlot={currentSlot} />;
            })}
          </div>

          {loading ? <div className="text-sm text-white/55">Chargement des etats on-chain...</div> : null}
        </div>
      </section>
    </main>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";

import { useConnection } from "@solana/wallet-adapter-react";

import { Activity, RefreshCw, ShieldCheck } from "lucide-react";

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
        throw new Error(payload.error || "Unable to load arena lobbies.");
      }

      setCurrentSlot(payload.currentSlot);
      setRooms(payload.rooms.map(deserializeRoomAccount));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load arena lobbies.");
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
          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="arena-kicker">Persistent Lobbies</p>
                <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-white sm:text-5xl">
                  Enter any stake bracket from 0.01 to 1 SOL without waiting for a relayer.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                  Every preset stays visible, reuses the same on-chain room, and supports the single-signature path: initialize if needed, join, and commit in one wallet action.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshRooms()}
                className="arena-secondary inline-flex w-full items-center justify-center gap-2 self-start px-5 py-3 text-sm uppercase tracking-[0.18em] text-white/82 sm:w-auto"
              >
                <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
                Refresh board
              </button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="arena-stat rounded-[1.6rem] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Visible presets</p>
                <p className="mt-3 font-display text-3xl text-white">{DEFAULT_ROOM_PRESETS.length}</p>
              </div>
              <div className="arena-stat rounded-[1.6rem] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Network slot</p>
                <p className="mt-3 inline-flex items-center gap-2 font-display text-3xl text-white">
                  <Activity className="size-5 text-fault-flare" />
                  {currentSlot}
                </p>
              </div>
              <div className="arena-stat rounded-[1.6rem] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Live automation</p>
                <p className="mt-3 inline-flex items-center gap-3 text-base text-white">
                  <span className="arena-live-dot" />
                  Refund and timeout heartbeat every {Math.round(AUTOMATION_HEARTBEAT_INTERVAL_MS / 1000)}s
                </p>
              </div>
            </div>
          </div>

          {error ? <div className="fault-card rounded-3xl p-5 text-sm text-fault-flare">{error}</div> : null}

          {!error ? (
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/68">
              <ShieldCheck className="size-4 text-fault-signal" />
              Rooms stream from confirmed on-chain state with websocket refreshes and a polling fallback.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {DEFAULT_ROOM_PRESETS.map((preset) => {
              const room = rooms.find((item) => item.presetId === preset.id) ?? null;

              return <RoomCard key={preset.id} preset={preset} room={room} currentSlot={currentSlot} />;
            })}
          </div>

          {loading ? <div className="text-sm text-white/55">Loading confirmed on-chain state...</div> : null}
        </div>
      </section>
    </main>
  );
}
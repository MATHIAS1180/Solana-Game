"use client";

import { useEffect, useRef, useState } from "react";

import { useConnection } from "@solana/wallet-adapter-react";

import { Activity, RefreshCw, ShieldCheck } from "lucide-react";

import { ProgramBanner } from "@/components/game/program-banner";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { RoomCard } from "@/components/rooms/room-card";
import { RivalryBoard } from "@/components/rooms/rivalry-board";
import { AUTOMATION_HEARTBEAT_INTERVAL_MS, DEFAULT_ROOM_PRESETS, ROOM_STATE_SIZE, ROOM_STATUS } from "@/lib/faultline/constants";
import { buildLiveRivalryBoard } from "@/lib/faultline/rivalry";
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

  const liveRooms = rooms.filter((room) => room.playerCount > 0 && room.status !== ROOM_STATUS.Resolved && room.status !== ROOM_STATUS.Cancelled && room.status !== ROOM_STATUS.Emergency);
  const joinableRooms = rooms.filter(
    (room) => room.status === ROOM_STATUS.Open && room.playerCount < room.maxPlayers && (room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 || currentSlot <= Number(room.joinDeadlineSlot))
  );
  const commitLiveCount = liveRooms.filter((room) => room.status === ROOM_STATUS.Commit).length;
  const revealLiveCount = liveRooms.filter((room) => room.status === ROOM_STATUS.Reveal).length;
  const lockedCommits = liveRooms.reduce((sum, room) => sum + room.committedCount, 0);
  const openedReveals = liveRooms.reduce((sum, room) => sum + room.revealedCount, 0);
  const openSeats = joinableRooms.reduce((sum, room) => sum + Math.max(room.maxPlayers - room.playerCount, 0), 0);
  const rivalryEntries = buildLiveRivalryBoard(rooms).slice(0, 5);
  const hottestRoom =
    [...liveRooms].sort((left, right) => {
      const leftScore = left.playerCount * 10 + left.committedCount * 8 + left.revealedCount * 12 + (left.status === ROOM_STATUS.Reveal ? 120 : left.status === ROOM_STATUS.Commit ? 80 : 40);
      const rightScore = right.playerCount * 10 + right.committedCount * 8 + right.revealedCount * 12 + (right.status === ROOM_STATUS.Reveal ? 120 : right.status === ROOM_STATUS.Commit ? 80 : 40);
      return rightScore - leftScore;
    })[0] ?? null;

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
                  Eight permanent arenas. One of them is heating up right now.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                  Every preset stays visible, reuses the same on-chain room, and supports the single-signature path: initialize if needed, join, and commit in one wallet action.
                  {hottestRoom ? ` Current pressure leader: ${Number(hottestRoom.stakeLamports) / 1_000_000_000} SOL with ${hottestRoom.playerCount} seated, ${lockedCommits} locked commits, and ${openedReveals} reveals already public across the board.` : ""}
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

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="arena-stat rounded-[1.6rem] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Live lanes</p>
                <p className="mt-3 font-display text-3xl text-white">{liveRooms.length || DEFAULT_ROOM_PRESETS.length}</p>
              </div>
              <div className="arena-stat rounded-[1.6rem] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Joinable now</p>
                <p className="mt-3 inline-flex items-center gap-2 font-display text-3xl text-white">
                  <Activity className="size-5 text-fault-flare" />
                  {joinableRooms.length}
                </p>
              </div>
              <div className="arena-stat rounded-[1.6rem] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commit / Reveal</p>
                <p className="mt-3 text-base text-white">
                  {commitLiveCount} commit live / {revealLiveCount} reveal live
                </p>
              </div>
              <div className="arena-stat rounded-[1.6rem] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Open seats</p>
                <p className="mt-3 inline-flex items-center gap-3 text-base text-white">
                  <span className="arena-live-dot" />
                  {openSeats} seats still contestable
                </p>
              </div>
            </div>

            <div className="mt-6">
              <RivalryBoard
                entries={rivalryEntries}
                eyebrow="Live Leaderboard"
                title="Regulars are already setting the pace across the visible board."
                summary="No synthetic profile math here. The board ranks wallets from visible pressure, locked commits, revealed reads, and rewards still sitting on resolved rooms."
              />
            </div>
          </div>

          {error ? <div className="fault-card rounded-3xl p-5 text-sm text-fault-flare">{error}</div> : null}

          {!error ? (
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/68">
              <ShieldCheck className="size-4 text-fault-signal" />
              Rooms stream from confirmed on-chain state with websocket refreshes, a polling fallback, and automation heartbeats every {Math.round(AUTOMATION_HEARTBEAT_INTERVAL_MS / 1000)}s.
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
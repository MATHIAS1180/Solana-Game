"use client";

import { useEffect, useRef, useState } from "react";

import { useConnection } from "@solana/wallet-adapter-react";

import { RefreshCw } from "lucide-react";

import { ProgramBanner } from "@/components/game/program-banner";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { RoomCard } from "@/components/rooms/room-card";
import { StatCard } from "@/components/ui/stat-card";
import { AUTOMATION_HEARTBEAT_INTERVAL_MS, DEFAULT_ROOM_PRESETS, ROOM_STATE_SIZE, ROOM_STATUS } from "@/lib/faultline/constants";
import { buildLiveRivalryBoard } from "@/lib/faultline/rivalry";
import { deserializeRoomAccount, type SerializedFaultlineRoomAccount } from "@/lib/faultline/transport";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { formatLamports } from "@/lib/utils";

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

      <section className="space-y-6">
        <div className="fault-card arena-pop-in rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="arena-kicker">Arena Board</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-white sm:text-5xl">Choose a lane. Ignore the rest.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                Persistent rooms stay visible so you can jump straight into live pressure instead of parsing a crowded dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshRooms()}
              className="arena-secondary inline-flex w-full items-center justify-center gap-2 self-start px-5 py-3 text-sm uppercase tracking-[0.18em] text-white/82 sm:w-auto"
            >
              <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard label="Live lanes" value={liveRooms.length || DEFAULT_ROOM_PRESETS.length} subtext="Rooms currently moving." className="arena-fade-in" />
            <StatCard label="Open seats" value={openSeats} subtext="Seats still available before lock." className="arena-fade-in arena-delay-1" />
            <StatCard label="Commit / Reveal" value={`${commitLiveCount} / ${revealLiveCount}`} subtext="Where the pressure sits right now." className="arena-fade-in arena-delay-2" />
          </div>

          {hottestRoom ? (
            <div className="arena-editorial-panel arena-float-soft mt-6 rounded-[1.6rem] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Featured lane</p>
                  <h2 className="mt-3 font-display text-2xl text-white">The hottest room is already doing the sorting for you.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                    {formatLamports(hottestRoom.stakeLamports)} stake, {hottestRoom.playerCount} seated, {lockedCommits} commits locked across the board, {openedReveals} reveals already opened.
                  </p>
                </div>
                <a href={`/rooms/${hottestRoom.publicKey.toBase58()}`} className="arena-primary px-5 py-3 text-xs uppercase tracking-[0.2em]">
                  Open live lane
                </a>
              </div>
            </div>
          ) : null}
        </div>

        {error ? <div className="fault-card rounded-3xl p-5 text-sm text-fault-flare">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {DEFAULT_ROOM_PRESETS.map((preset, index) => {
            const room = rooms.find((item) => item.presetId === preset.id) ?? null;

            return <RoomCard key={preset.id} preset={preset} room={room} currentSlot={currentSlot} />;
          })}
        </div>

        <div className="fault-card rounded-[1.8rem] p-5 sm:p-6 arena-fade-in">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Optional</p>
          <h2 className="mt-3 font-display text-2xl text-white">Need a custom room instead of a persistent lane?</h2>
          <div className="mt-5">
            <CreateRoomForm />
          </div>
        </div>

        {loading ? <div className="text-sm text-white/55">Loading confirmed on-chain state...</div> : null}
      </section>
    </main>
  );
}
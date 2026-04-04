"use client";

import { useEffect, useState } from "react";

import { useConnection } from "@solana/wallet-adapter-react";
import { RefreshCw } from "lucide-react";

import { ProgramBanner } from "@/components/game/program-banner";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { RoomCard } from "@/components/rooms/room-card";
import { fetchRooms } from "@/lib/faultline/rooms";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";

export function RoomsPage() {
  const { connection } = useConnection();
  const [rooms, setRooms] = useState<FaultlineRoomAccount[]>([]);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const programId = getFaultlineProgramId();

  async function refreshRooms() {
    if (!programId) {
      setError("NEXT_PUBLIC_FAULTLINE_PROGRAM_ID est requis pour charger les rooms.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [nextRooms, slot] = await Promise.all([fetchRooms(connection, programId), connection.getSlot("confirmed")]);
      setCurrentSlot(slot);
      setRooms(nextRooms.sort((left, right) => Number(right.createdSlot - left.createdSlot)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Chargement des rooms echoue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRooms();
  }, [connection, programId]);

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
              <RefreshCw className="size-4" />
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
                Aucune room lisible pour ce Program ID. Deploie d’abord le programme SolPG, renseigne le Program ID, puis cree une room.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
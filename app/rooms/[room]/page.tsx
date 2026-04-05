import type { Metadata } from "next";

import { RoomPage } from "@/components/game/room-page";
import { getRoomSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }): Promise<Metadata> {
  const { room } = await params;

  return {
    title: `Room ${room.slice(0, 6)}...${room.slice(-4)}`,
    description: "Track a live Faultline Arena room on Solana, monitor commit and reveal phases, and enter the arena with a single wallet transaction.",
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true
      }
    },
    openGraph: {
      title: `Faultline Arena Room ${room.slice(0, 6)}...${room.slice(-4)}`,
      description: "Live Solana room telemetry for Faultline Arena: commits, reveals, room actions, and settlement state.",
      url: `/rooms/${room}`
    }
  };
}

export default async function RoomRoute({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  try {
    const snapshot = await getRoomSnapshot(room);
    return (
      <RoomPage
        roomAddress={room}
        initialCurrentSlot={snapshot?.currentSlot}
        initialRoom={snapshot?.room ?? undefined}
        initialPresetId={snapshot?.presetId ?? null}
        initialError={snapshot ? null : "Room not found."}
      />
    );
  } catch (error) {
    return <RoomPage roomAddress={room} initialError={error instanceof Error ? error.message : "Unable to load room state."} />;
  }
}
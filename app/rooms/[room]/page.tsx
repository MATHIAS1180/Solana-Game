import type { Metadata } from "next";

import { RoomPage } from "@/components/game/room-page";
import { findDefaultRoomPreset, ROOM_STATUS_LABELS } from "@/lib/faultline/constants";
import { getRoomSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }): Promise<Metadata> {
  const { room } = await params;
  const snapshot = await getRoomSnapshot(room);
  const preset = findDefaultRoomPreset(snapshot?.presetId ?? -1);
  const roomState = snapshot?.room ?? null;
  const phaseLabel = roomState ? ROOM_STATUS_LABELS[roomState.status] : "Standby";
  const playerLabel = roomState ? `${roomState.playerCount}/${roomState.maxPlayers} players` : preset ? `${preset.minPlayers}-${preset.maxPlayers} players` : "Live room";
  const stakeLabel = roomState ? `${Number(roomState.stakeLamports) / 1_000_000_000} SOL` : preset ? preset.name : "Faultline Arena";
  const title = roomState ? `${stakeLabel} Arena | ${phaseLabel}` : preset ? `${preset.name} Arena | ${phaseLabel}` : `Room ${room.slice(0, 6)}...${room.slice(-4)}`;
  const description = roomState
    ? `Track a live ${stakeLabel} Faultline Arena room on Solana: ${phaseLabel.toLowerCase()} phase, ${playerLabel}, ${roomState.committedCount} commits, ${roomState.revealedCount} reveals.`
    : `Track a live Faultline Arena room on Solana, monitor commit and reveal phases, and enter the arena with a single wallet transaction.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/rooms/${room}`
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true
      }
    },
    openGraph: {
      title: `${title} | Faultline Arena`,
      description,
      url: `/rooms/${room}`
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Faultline Arena`,
      description
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
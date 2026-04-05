import type { Metadata } from "next";

import { RoomsPage } from "@/components/rooms/rooms-page";
import { getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena Lobbies",
  description: "Browse persistent Faultline Arena lobbies on Solana, compare stake brackets, and enter a live prediction room with a single wallet flow."
};

export default async function RoomsRoute() {
  try {
    const snapshot = await getVisibleRoomsSnapshot();
    return <RoomsPage initialRooms={snapshot.rooms} initialCurrentSlot={snapshot.currentSlot} />;
  } catch (error) {
    return <RoomsPage initialError={error instanceof Error ? error.message : "Unable to load arena lobbies."} />;
  }
}
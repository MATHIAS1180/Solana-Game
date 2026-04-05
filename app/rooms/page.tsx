import type { Metadata } from "next";

import { RoomsPage } from "@/components/rooms/rooms-page";
import { getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena Lobbies",
  description: "Browse persistent Faultline Arena lobbies on Solana, compare stake brackets, and enter a live prediction room with a single wallet flow.",
  alternates: process.env.NEXT_PUBLIC_SITE_URL
    ? {
        canonical: "/rooms"
      }
    : undefined,
  openGraph: {
    title: "Arena Lobbies | Faultline Arena",
    description: "Compare the live Faultline Arena stake brackets on Solana and enter a persistent prediction lobby with one wallet flow.",
    url: "/rooms"
  },
  twitter: {
    card: "summary_large_image",
    title: "Arena Lobbies | Faultline Arena",
    description: "Browse persistent Solana lobbies from 0.01 to 1 SOL and jump into live commit-reveal PvP."
  }
};

export default async function RoomsRoute() {
  try {
    const snapshot = await getVisibleRoomsSnapshot();
    return <RoomsPage initialRooms={snapshot.rooms} initialCurrentSlot={snapshot.currentSlot} />;
  } catch (error) {
    return <RoomsPage initialError={error instanceof Error ? error.message : "Unable to load arena lobbies."} />;
  }
}
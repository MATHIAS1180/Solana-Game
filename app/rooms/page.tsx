import { RoomsPage } from "@/components/rooms/rooms-page";
import { getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

export default async function RoomsRoute() {
  try {
    const snapshot = await getVisibleRoomsSnapshot();
    return <RoomsPage initialRooms={snapshot.rooms} initialCurrentSlot={snapshot.currentSlot} />;
  } catch (error) {
    return <RoomsPage initialError={error instanceof Error ? error.message : "Chargement des rooms echoue."} />;
  }
}
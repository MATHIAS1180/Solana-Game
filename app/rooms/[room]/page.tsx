import { RoomPage } from "@/components/game/room-page";
import { getRoomSnapshot } from "@/lib/faultline/server-data";

export const dynamic = "force-dynamic";

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
        initialError={snapshot ? null : "Room introuvable."}
      />
    );
  } catch (error) {
    return <RoomPage roomAddress={room} initialError={error instanceof Error ? error.message : "Lecture de room impossible."} />;
  }
}
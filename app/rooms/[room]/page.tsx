import { RoomPage } from "@/components/game/room-page";

export default async function RoomRoute({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return <RoomPage roomAddress={room} />;
}
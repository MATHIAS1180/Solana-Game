import { NextResponse } from "next/server";

import { ROOM_STATUS } from "@/lib/faultline/constants";
import { getPersistentMetagameSnapshot, getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";
import { deserializeRoomAccount } from "@/lib/faultline/transport";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [visible, metagame] = await Promise.all([getVisibleRoomsSnapshot(), getPersistentMetagameSnapshot(50)]);
    const rooms = visible.rooms.map(deserializeRoomAccount);
    const liveRooms = rooms.filter((room) => room.playerCount > 0 && room.status !== ROOM_STATUS.Resolved && room.status !== ROOM_STATUS.Cancelled && room.status !== ROOM_STATUS.Emergency);

    const activePlayers = liveRooms.reduce((sum, room) => sum + room.playerCount, 0);
    const solInPlayLamports = liveRooms.reduce((sum, room) => sum + room.totalStakedLamports, 0n);
    const totalRounds = metagame.recentRounds.length;
    const totalVolumeLamports = metagame.recentRounds.reduce((sum, round) => sum + BigInt(round.totalStakedLamports), 0n);
    const joinableRooms = liveRooms.filter(
      (room) =>
        room.status === ROOM_STATUS.Open &&
        room.playerCount < room.maxPlayers &&
        (room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 || visible.currentSlot <= Number(room.joinDeadlineSlot))
    ).length;
    const commitLiveCount = liveRooms.filter((room) => room.status === ROOM_STATUS.Commit).length;
    const revealLiveCount = liveRooms.filter((room) => room.status === ROOM_STATUS.Reveal).length;
    const openSeats = liveRooms.reduce((sum, room) => sum + Math.max(room.maxPlayers - room.playerCount, 0), 0);
    const lockedCommits = liveRooms.reduce((sum, room) => sum + room.committedCount, 0);
    const openedReveals = liveRooms.reduce((sum, room) => sum + room.revealedCount, 0);
    const hottestStakeLamports = liveRooms.reduce((highest, room) => (room.stakeLamports > highest ? room.stakeLamports : highest), 0n);

    return NextResponse.json({
      ok: true,
      activePlayers,
      solInPlayLamports: solInPlayLamports.toString(),
      roundsLive: liveRooms.length,
      joinableRooms,
      commitLiveCount,
      revealLiveCount,
      openSeats,
      lockedCommits,
      openedReveals,
      hottestStakeLamports: hottestStakeLamports.toString(),
      totalRounds,
      totalVolumeLamports: totalVolumeLamports.toString()
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

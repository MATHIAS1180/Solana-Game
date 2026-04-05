import Link from "next/link";

import { ProgramBanner } from "@/components/game/program-banner";
import { ROOM_STATUS, ROOM_STATUS_LABELS } from "@/lib/faultline/constants";
import { buildRoundReplaySlug } from "@/lib/faultline/metagame";
import { getPersistentMetagameSnapshot, getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";
import { getProtocolManifest } from "@/lib/faultline/protocol";
import { deserializeRoomAccount } from "@/lib/faultline/transport";
import { formatCountdown, formatLamports, shortKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getWindowLabel(status: number, currentSlot: number, room: { joinDeadlineSlot: bigint; commitDeadlineSlot: bigint; revealDeadlineSlot: bigint }) {
  if (status === ROOM_STATUS.Open) {
    return Number(room.joinDeadlineSlot) > 0 ? formatCountdown(Number(room.joinDeadlineSlot) - currentSlot) : "standby";
  }
  if (status === ROOM_STATUS.Commit) {
    return Number(room.commitDeadlineSlot) > 0 ? formatCountdown(Number(room.commitDeadlineSlot) - currentSlot) : "live";
  }
  if (status === ROOM_STATUS.Reveal) {
    return Number(room.revealDeadlineSlot) > 0 ? formatCountdown(Number(room.revealDeadlineSlot) - currentSlot) : "live";
  }
  return "settled";
}

function buildWatchTicker(params: {
  liveRooms: Array<ReturnType<typeof deserializeRoomAccount>>;
  currentSlot: number;
  recentRounds: Awaited<ReturnType<typeof getPersistentMetagameSnapshot>>["recentRounds"];
}) {
  const liveEvents = params.liveRooms.slice(0, 4).map((room) => ({
    key: `${room.publicKey.toBase58()}:${room.createdSlot.toString()}`,
    label: room.status === ROOM_STATUS.Reveal ? "Reveal live" : room.status === ROOM_STATUS.Commit ? "Commit pressure" : "Open seats",
    detail: `${formatLamports(room.stakeLamports)} / ${room.playerCount} seats / ${getWindowLabel(room.status, params.currentSlot, room)}`,
    href: `/rooms/${room.publicKey.toBase58()}` as `/${string}`
  }));

  const replayEvents = params.recentRounds.slice(0, 4).map((round) => ({
    key: round.id,
    label: "Replay ready",
    detail: `${formatLamports(BigInt(round.stakeLamports))} / winner ${round.winnerWallets[0] ? shortKey(round.winnerWallets[0], 6) : "unknown"}`,
    href: `/replay/${buildRoundReplaySlug({ room: round.room, createdSlot: round.createdSlot })}` as `/${string}`
  }));

  return [...liveEvents, ...replayEvents].slice(0, 8);
}

export default async function WatchPage() {
  const [liveSnapshot, metagame] = await Promise.all([getVisibleRoomsSnapshot(), getPersistentMetagameSnapshot(8)]);
  const protocol = getProtocolManifest();
  const rooms = liveSnapshot.rooms.map(deserializeRoomAccount);
  const liveRooms = rooms.filter((room) => room.playerCount > 0 && room.status !== ROOM_STATUS.Resolved && room.status !== ROOM_STATUS.Cancelled && room.status !== ROOM_STATUS.Emergency);
  const hottestRoom = [...liveRooms].sort((left, right) => right.playerCount + right.committedCount + right.revealedCount - (left.playerCount + left.committedCount + left.revealedCount))[0] ?? null;
  const activeSeats = liveRooms.reduce((sum, room) => sum + room.playerCount, 0);
  const ticker = buildWatchTicker({ liveRooms, currentSlot: liveSnapshot.currentSlot, recentRounds: metagame.recentRounds });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Watch Live</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl">A spectator surface built to watch pressure form, not just inspect room state.</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Live lanes</p>
            <p className="mt-3 text-3xl text-white">{liveRooms.length}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Active seats</p>
            <p className="mt-3 text-3xl text-white">{activeSeats}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commit seal</p>
            <p className="mt-3 text-3xl text-white">V{protocol.commitVersion}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Reserve routing</p>
            <p className="mt-3 text-lg text-white">Reserve PDA</p>
          </div>
        </div>
        {hottestRoom ? (
          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Hottest lane now</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-3xl text-white">{formatLamports(hottestRoom.stakeLamports)} / {ROOM_STATUS_LABELS[hottestRoom.status]}</h2>
                <p className="mt-2 text-sm leading-7 text-white/68">{hottestRoom.playerCount} seats visible, {hottestRoom.committedCount} commits locked, {hottestRoom.revealedCount} reveals opened.</p>
              </div>
              <Link href={`/rooms/${hottestRoom.publicKey.toBase58()}`} className="arena-primary px-5 py-3 text-xs uppercase tracking-[0.2em]">
                Open live room
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Live Rooms</p>
            <h2 className="mt-3 font-display text-2xl text-white">Current broadcast board.</h2>
            <div className="mt-6 space-y-3">
              {liveRooms.length > 0 ? (
                liveRooms.map((room) => (
                  <div key={`${room.publicKey.toBase58()}:${room.createdSlot.toString()}`} className="arena-surface rounded-2xl p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Link href={`/rooms/${room.publicKey.toBase58()}`} className="font-display text-xl text-white transition hover:text-fault-flare">
                          {formatLamports(room.stakeLamports)} Arena
                        </Link>
                        <p className="mt-1 text-sm text-white/68">{ROOM_STATUS_LABELS[room.status]} / {room.playerCount} seats / {room.committedCount} commits / {room.revealedCount} reveals</p>
                      </div>
                      <div className="text-sm text-white/72 sm:text-right">
                        <p>Window {getWindowLabel(room.status, liveSnapshot.currentSlot, room)}</p>
                        <p className="mt-1">Round #{room.createdSlot.toString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
                  No live room is currently active. This page will light up again as soon as the next seat starts a public clock.
                </div>
              )}
            </div>
          </div>

          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Recent Settlements</p>
            <h2 className="mt-3 font-display text-2xl text-white">The last rounds that made it into the persistent ledger.</h2>
            <div className="mt-6 space-y-3">
              {metagame.recentRounds.length > 0 ? (
                metagame.recentRounds.map((round) => (
                  <div key={round.id} className="arena-surface rounded-2xl p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Link href={`/rooms/${round.room}`} className="font-display text-xl text-white transition hover:text-fault-flare">
                          {formatLamports(BigInt(round.stakeLamports))} Arena
                        </Link>
                        <p className="mt-1 text-sm text-white/68">Histogram [{round.finalHistogram.join(", ")}] / {round.revealedCount} reveal{round.revealedCount === 1 ? "" : "s"}</p>
                      </div>
                      <div className="text-sm text-white/72 sm:text-right">
                        <p>{round.winnerWallets[0] ? `Winner ${shortKey(round.winnerWallets[0], 6)}` : "No winner recorded"}</p>
                        <p className="mt-1">Reserve {formatLamports(BigInt(round.reserveFeeLamports))}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link href={`/replay/${buildRoundReplaySlug({ room: round.room, createdSlot: round.createdSlot })}`} className="arena-secondary inline-flex px-4 py-2 text-xs uppercase tracking-[0.2em]">
                        Open replay
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
                  No resolved room has been persisted yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Broadcast Ticker</p>
            <h2 className="mt-3 font-display text-2xl text-white">The shortest path to what matters right now.</h2>
            <div className="mt-6 space-y-3">
              {ticker.length > 0 ? (
                ticker.map((entry) => (
                  <a key={entry.key} href={entry.href} className="arena-surface block rounded-2xl p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-fault-flare">{entry.label}</p>
                        <p className="mt-2 text-sm text-white/78">{entry.detail}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-white/45">Open</span>
                    </div>
                  </a>
                ))
              ) : (
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
                  The board is calm right now. This ticker will light up as soon as live pressure or new replays appear.
                </div>
              )}
            </div>
          </div>

          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Protocol Console</p>
            <h2 className="mt-3 font-display text-2xl text-white">Watcher-grade protocol facts.</h2>
            <div className="mt-6 space-y-3 text-sm text-white/70">
              <div className="arena-surface rounded-2xl p-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Program</p>
                <p className="mt-2 break-all text-white">{protocol.programId ?? "missing"}</p>
              </div>
              <div className="arena-surface rounded-2xl p-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Structured events</p>
                <p className="mt-2 text-white">Schema v{protocol.eventSchemaVersion} / {protocol.structuredEventsEnabled ? "enabled" : "disabled"}</p>
              </div>
              <div className="arena-surface rounded-2xl p-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Emergency path</p>
                <p className="mt-2 text-white">{protocol.emergencyActionsEnabled ? "frontend flag enabled" : "disabled in public UI"}</p>
              </div>
            </div>
          </div>

          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <p className="arena-kicker">Persistent Ladder</p>
            <h2 className="mt-3 font-display text-2xl text-white">Who is shaping the board over time.</h2>
            <div className="mt-6 space-y-3">
              {metagame.leaderboard.length > 0 ? (
                metagame.leaderboard.slice(0, 8).map((entry, index) => (
                  <div key={entry.wallet} className="arena-surface rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link href={`/players/${entry.wallet}`} className="font-display text-lg text-white transition hover:text-fault-flare">
                          #{index + 1} {shortKey(entry.wallet, 6)}
                        </Link>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-fault-flare">Score {entry.score}</p>
                      </div>
                      <div className="text-right text-sm text-white/72">
                        <p>{formatLamports(BigInt(entry.totalPayoutLamports))}</p>
                        <p className="mt-1">{entry.roundsWon} wins</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="arena-surface rounded-2xl p-4 text-sm leading-7 text-white/68">
                  The persistent ladder is still empty.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
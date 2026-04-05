"use client";

import { useEffect, useRef, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BadgeCheck, Clock3, Radar, Users, Wallet } from "lucide-react";

import { CommitComposer } from "@/components/game/commit-composer";
import { PhaseBadge } from "@/components/game/phase-badge";
import { ProgramBanner } from "@/components/game/program-banner";
import { RevealPanel } from "@/components/game/reveal-panel";
import { ResultPanel } from "@/components/game/result-panel";
import { RoomActions } from "@/components/game/room-actions";
import { RoomTimeline } from "@/components/game/room-timeline";
import { AUTOMATION_HEARTBEAT_INTERVAL_MS, DEFAULT_ROOM_PRESETS, PLAYER_STATUS, ROOM_STATE_SIZE, ROOM_STATUS } from "@/lib/faultline/constants";
import { PLAYER_STATUS_LABELS, RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { decodeRoomAccount } from "@/lib/faultline/layout";
import { findPlayerIndex } from "@/lib/faultline/rooms";
import { deserializeRoomAccount, type SerializedFaultlineRoomAccount } from "@/lib/faultline/transport";
import type { FaultlineRoomAccount, RoomPreset } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { cn, formatCountdown, formatLamports, shortKey } from "@/lib/utils";

type RoomPageProps = {
  roomAddress: string;
  initialRoom?: SerializedFaultlineRoomAccount;
  initialCurrentSlot?: number;
  initialPresetId?: number | null;
  initialError?: string | null;
};

const EMPTY_PUBLIC_KEY = new PublicKey(new Uint8Array(32));

function buildPendingRoom(roomAddress: string, preset: RoomPreset): FaultlineRoomAccount {
  const roomKey = new PublicKey(roomAddress);

  return {
    publicKey: roomKey,
    version: 1,
    roomBump: 0,
    vaultBump: 0,
    status: ROOM_STATUS.Open,
    zoneCount: 5,
    minPlayers: preset.minPlayers,
    maxPlayers: preset.maxPlayers,
    playerCount: 0,
    committedCount: 0,
    revealedCount: 0,
    activeCount: 0,
    winnerCount: 4,
    presetId: preset.id,
    flags: 0,
    stakeLamports: BigInt(preset.stakeLamports),
    totalStakedLamports: 0n,
    distributableLamports: 0n,
    reserveFeeLamports: 0n,
    slashedToReserveLamports: 0n,
    createdSlot: 0n,
    joinDeadlineSlot: 0n,
    joinDurationSlots: BigInt(preset.joinWindowSlots),
    commitDurationSlots: BigInt(preset.commitWindowSlots),
    commitDeadlineSlot: 0n,
    revealDurationSlots: BigInt(preset.revealWindowSlots),
    revealDeadlineSlot: 0n,
    resolveSlot: 0n,
    creator: EMPTY_PUBLIC_KEY,
    vault: EMPTY_PUBLIC_KEY,
    reserve: EMPTY_PUBLIC_KEY,
    treasury: EMPTY_PUBLIC_KEY,
    roomSeed: new Uint8Array(32),
    finalHistogram: [0, 0, 0, 0, 0],
    winnerIndices: [255, 255, 255, 255],
    payoutBps: [7200, 1800, 800, 0],
    playerKeys: Array.from({ length: 12 }, () => EMPTY_PUBLIC_KEY),
    playerStatuses: Array.from({ length: 12 }, () => 0) as FaultlineRoomAccount["playerStatuses"],
    playerClaimed: Array.from({ length: 12 }, () => false),
    playerZones: Array.from({ length: 12 }, () => 0),
    playerRisks: Array.from({ length: 12 }, () => 0),
    playerCommitHashes: Array.from({ length: 12 }, () => new Uint8Array(32)),
    playerForecasts: Array.from({ length: 12 }, () => [0, 0, 0, 0, 0] as [number, number, number, number, number]),
    playerErrors: Array.from({ length: 12 }, () => 0),
    playerScoresBps: Array.from({ length: 12 }, () => 0),
    playerRewardsLamports: Array.from({ length: 12 }, () => 0n)
  };
}

function getPhasePresentation(room: FaultlineRoomAccount, currentSlot: number) {
  const joinRemaining = room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 ? null : Number(room.joinDeadlineSlot) - currentSlot;
  const commitRemaining = Number(room.commitDeadlineSlot) > 0 ? Number(room.commitDeadlineSlot) - currentSlot : null;
  const revealRemaining = Number(room.revealDeadlineSlot) > 0 ? Number(room.revealDeadlineSlot) - currentSlot : null;

  switch (room.status) {
    case ROOM_STATUS.Open:
      if (room.playerCount === 0) {
        return {
          phase: "open",
          label: "Waiting for the first seat",
          countdown: "Standby",
          urgent: false,
          description: "This lane is armed but empty. The next wallet starts the public join clock and sets the pressure profile of the round."
        };
      }

      if (joinRemaining !== null && joinRemaining <= 0 && room.playerCount < room.minPlayers) {
        return {
          phase: "open",
          label: "Reset window is live",
          countdown: "Expired",
          urgent: true,
          description: "The room missed minimum participation. Anyone can cancel, refund, and reopen the same lane without an operator."
        };
      }

      return {
        phase: "open",
        label: room.playerCount < room.minPlayers ? "Seats still needed" : "Open pressure building",
        countdown: joinRemaining === null ? "Standby" : formatCountdown(joinRemaining),
        urgent: joinRemaining !== null && joinRemaining <= 30,
        description: "The crowd is still forming. This is the last low-information moment before private reads start locking the room."
      };
    case ROOM_STATUS.Commit:
      return {
        phase: "commit",
        label: "Private reads locking now",
        countdown: commitRemaining === null ? "Live" : formatCountdown(commitRemaining),
        urgent: commitRemaining !== null && commitRemaining <= 30,
        description: "Commits are live. Players can still disagree radically, but the room is already sealed against late adaptation."
      };
    case ROOM_STATUS.Reveal:
      return {
        phase: "reveal",
        label: room.revealedCount === room.committedCount ? "Ready to resolve" : "Final truth entering the room",
        countdown: revealRemaining === null ? "Live" : formatCountdown(revealRemaining),
        urgent: revealRemaining !== null && revealRemaining <= 30,
        description: "The sealed reads are opening. Every reveal sharpens the histogram, changes band outcomes, and shifts who still owns live equity."
      };
    case ROOM_STATUS.Resolved:
      return {
        phase: "resolved",
        label: "Outcome fixed on-chain",
        countdown: "Resolved",
        urgent: false,
        description: "The room is done. What matters now is understanding the miss, claiming if you cashed, and queuing the same lane again."
      };
    case ROOM_STATUS.Cancelled:
      return {
        phase: "cancelled",
        label: "Round voided",
        countdown: "Cancelled",
        urgent: false,
        description: "This round never reached a valid scoring state. Only refunds and reset logic matter now."
      };
    default:
      return {
        phase: "emergency",
        label: "Emergency state",
        countdown: "Paused",
        urgent: false,
        description: "The normal loop is interrupted. Only trust-preserving recovery actions should remain available."
      };
  }
}

export function RoomPage({ roomAddress, initialRoom, initialCurrentSlot = 0, initialPresetId = null, initialError = null }: RoomPageProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const programId = getFaultlineProgramId();
  const [room, setRoom] = useState<FaultlineRoomAccount | null>(() => (initialRoom ? deserializeRoomAccount(initialRoom) : null));
  const [currentSlot, setCurrentSlot] = useState(initialCurrentSlot);
  const [presetId, setPresetId] = useState<number | null>(initialPresetId);
  const [error, setError] = useState<string | null>(initialError);
  const refreshInFlightRef = useRef(false);

  async function refreshRoom() {
    if (refreshInFlightRef.current) {
      return;
    }

    try {
      refreshInFlightRef.current = true;
      const response = await fetch(`/api/rooms/${roomAddress}`, { cache: "no-store" });
      const payload = (await response.json()) as { ok: boolean; error?: string; currentSlot?: number; presetId?: number | null; room?: SerializedFaultlineRoomAccount | null };

      if (!response.ok || !payload.ok || payload.currentSlot === undefined) {
        throw new Error(payload.error || "Unable to load room state.");
      }

      setCurrentSlot(payload.currentSlot);
      setPresetId(payload.presetId ?? null);
      setRoom(payload.room ? deserializeRoomAccount(payload.room) : null);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load room state.");
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  useEffect(() => {
    void refreshRoom();
  }, [roomAddress]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshRoom();
    }, AUTOMATION_HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [roomAddress]);

  useEffect(() => {
    const roomKey = new PublicKey(roomAddress);
    const slotSubId = connection.onSlotChange((update) => {
      setCurrentSlot(update.slot);
    });

    let accountSubId: number | null = null;
    let programSubId: number | null = null;

    if (room) {
      accountSubId = connection.onAccountChange(
        roomKey,
        (accountInfo) => {
          setRoom(decodeRoomAccount(roomKey, accountInfo.data));
          setError(null);
        },
        "confirmed"
      );
    } else if (programId) {
      programSubId = connection.onProgramAccountChange(
        programId,
        ({ accountId }) => {
          if (accountId.toBase58() === roomAddress) {
            void refreshRoom();
          }
        },
        "confirmed",
        [{ dataSize: ROOM_STATE_SIZE }]
      );
    }

    return () => {
      void connection.removeSlotChangeListener(slotSubId);
      if (accountSubId !== null) {
        void connection.removeAccountChangeListener(accountSubId);
      }
      if (programSubId !== null) {
        void connection.removeProgramAccountChangeListener(programSubId);
      }
    };
  }, [connection, programId, room, roomAddress]);

  if (error) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:px-10 lg:px-12">
        <ProgramBanner />
        <div className="fault-card mt-8 rounded-[1.75rem] p-8 text-fault-flare">{error}</div>
      </main>
    );
  }

  const preset = presetId !== null ? DEFAULT_ROOM_PRESETS.find((item) => item.id === presetId) ?? null : null;

  if (!room && preset) {
    const pendingRoom = buildPendingRoom(roomAddress, preset);

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
        <ProgramBanner />

        <section className="fault-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="arena-kicker">System Lobby</p>
              <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">{preset.name} is ready to be initialized</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
                No active room account exists for this preset yet. The first gameplay transaction creates the room if needed, then joins and commits within the same wallet flow.
              </p>
            </div>
            <div className="rounded-full border border-white/12 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/72">
              {preset.minPlayers}-{preset.maxPlayers} players
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
              <p className="mt-3 text-2xl text-white">{formatLamports(BigInt(preset.stakeLamports))}</p>
            </div>
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Join window</p>
              <p className="mt-3 text-2xl text-white">{preset.joinWindowSlots} slots</p>
            </div>
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Reveal window</p>
              <p className="mt-3 text-2xl text-white">{preset.revealWindowSlots} slots</p>
            </div>
          </div>
        </section>

        <CommitComposer room={pendingRoom} playerIndex={-1} presetId={preset.id} onCommitted={refreshRoom} />
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:px-10 lg:px-12">
        <ProgramBanner />
        <div className="fault-card mt-8 h-80 animate-pulse rounded-[1.75rem] bg-white/5" />
      </main>
    );
  }

  const playerIndex = publicKey ? findPlayerIndex(room, publicKey) : -1;
  const phase = getPhasePresentation(room, currentSlot);
  const playerStatus = playerIndex >= 0 ? room.playerStatuses[playerIndex] : null;
  const showCommitComposer = playerStatus === PLAYER_STATUS.Joined || (playerIndex === -1 && room.status === ROOM_STATUS.Open && room.playerCount < room.maxPlayers);
  const showRevealPanel = playerStatus === PLAYER_STATUS.Committed && room.status === ROOM_STATUS.Reveal;
  const viewerState =
    playerIndex >= 0
      ? {
          label: PLAYER_STATUS_LABELS[room.playerStatuses[playerIndex]],
          zone: room.playerStatuses[playerIndex] === 3 ? `Zone ${ZONE_LABELS[room.playerZones[playerIndex]]}` : "Hidden until reveal"
        }
      : null;
  const totalPot = room.totalStakedLamports > 0n ? formatLamports(room.totalStakedLamports) : "No pot yet";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card arena-phase-shell rounded-[2rem] p-6 sm:p-8" data-phase={phase.phase}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="arena-kicker">Room Detail</p>
            <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
              {preset ? `${preset.name} Arena` : "Faultline Arena Room"} {shortKey(room.publicKey, 6)}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
              Permissionless live room on Solana devnet. The first wallet opens the arena, then any visitor can join, reveal, resolve, refund, or claim as phase rules allow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="arena-live-dot" />
            <span className="arena-chip" data-tone={phase.urgent ? "ember" : "signal"}>{phase.label}</span>
            <PhaseBadge status={room.status} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(room.stakeLamports)}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Players</p>
            <p className="mt-3 inline-flex items-center gap-2 text-2xl text-white">
              <Users className="size-5 text-fault-flare" />
              {room.playerCount} / {room.maxPlayers}
            </p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commits / Reveals</p>
            <p className="mt-3 text-2xl text-white">{room.committedCount} / {room.revealedCount}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Current slot</p>
            <p className="mt-3 inline-flex items-center gap-2 text-2xl text-white">
              <Clock3 className="size-5 text-fault-flare" />
              {currentSlot}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="arena-surface arena-grid-glow rounded-[1.6rem] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="arena-chip" data-tone="signal">
                <Radar className="size-3.5" />
                Live room telemetry
              </span>
              <span className="arena-chip" data-tone="flare">
                <Wallet className="size-3.5" />
                Total pot {totalPot}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Pressure window</p>
                <p className={cn("mt-2 font-display text-3xl text-white sm:text-4xl", phase.urgent && "arena-urgent-text")}>{phase.countdown}</p>
              </div>
              <div className="max-w-xs text-sm leading-7 text-white/68">
                This board stays synced from confirmed Solana state, so joins, reveals, refunds, and claims surface without manual refresh.
              </div>
            </div>
          </div>

          <div className="arena-surface rounded-[1.6rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Your seat</p>
            {viewerState ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="arena-chip" data-tone="signal">
                  <BadgeCheck className="size-3.5" />
                  {viewerState.label}
                </span>
                <span className="arena-chip">{viewerState.zone}</span>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-white/68">
                You are currently spectating. Join the arena to store a local commit payload and unlock reveal and claim flows for your wallet.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/68">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Current tension</p>
          <p className="mt-3">{phase.description}</p>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <RoomActions room={room} currentSlot={currentSlot} playerIndex={playerIndex} onRefresh={refreshRoom} />

        <div className="space-y-6">
          {showCommitComposer ? <CommitComposer room={room} playerIndex={playerIndex} onCommitted={refreshRoom} /> : null}
          {showRevealPanel ? <RevealPanel room={room} onRevealed={refreshRoom} /> : null}
          {playerStatus === PLAYER_STATUS.Committed && room.status === ROOM_STATUS.Commit ? (
            <div className="fault-card rounded-[1.75rem] p-6 text-sm leading-7 text-white/68">
              <p className="arena-kicker">Reveal Standby</p>
              <h2 className="mt-3 font-display text-2xl text-white">Your read is sealed. The room still needs the reveal window to open.</h2>
              <p className="mt-3">
                Once every remaining seat commits or the protocol pushes the phase forward, this room will unlock reveal and your local proof payload will become actionable.
              </p>
            </div>
          ) : null}

          <RoomTimeline room={room} currentSlot={currentSlot} />

          <div className="fault-card rounded-[1.75rem] p-6">
            <p className="arena-kicker">Spectator Board</p>
            <h2 className="mt-3 font-display text-2xl text-white">Track every seat in the arena.</h2>
            <div className="mt-6 space-y-3">
              {room.playerCount === 0 ? <p className="text-sm text-white/62">No players are seated yet. The next wallet to commit will start the public join clock.</p> : null}
              {Array.from({ length: room.playerCount }, (_, index) => (
                <div
                  key={room.playerKeys[index].toBase58()}
                  className={cn(
                    "arena-seat-card grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[0.34fr_0.18fr_0.18fr_0.3fr] md:items-center",
                    "arena-fade-in",
                    index % 3 === 1 && "arena-delay-1",
                    index % 3 === 2 && "arena-delay-2",
                    publicKey && room.playerKeys[index].equals(publicKey) && "border-fault-signal/35 bg-fault-signal/6"
                  )}
                  data-status={PLAYER_STATUS_LABELS[room.playerStatuses[index]]}
                >
                  <p className="break-all text-sm text-white">
                    <a href={`/players/${room.playerKeys[index].toBase58()}`} className="transition hover:text-fault-flare">
                      {shortKey(room.playerKeys[index], 6)}
                    </a>
                  </p>
                  <p className="text-sm text-white/70">{PLAYER_STATUS_LABELS[room.playerStatuses[index]]}</p>
                  <p className="text-sm text-white/70">{room.playerStatuses[index] === 3 ? `Zone ${ZONE_LABELS[room.playerZones[index]]}` : "Hidden"}</p>
                  <p className="text-sm text-white/70">{room.playerStatuses[index] === 3 ? RISK_LABELS[room.playerRisks[index]] : "Waiting for reveal"}</p>
                </div>
              ))}
            </div>
          </div>

          <ResultPanel room={room} playerIndex={playerIndex} roomHref={`/rooms/${room.publicKey.toBase58()}`} />
        </div>
      </section>
    </main>
  );
}
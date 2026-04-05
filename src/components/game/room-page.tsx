"use client";

import { useEffect, useRef, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BadgeCheck, Radar } from "lucide-react";

import { CommitComposer } from "@/components/game/commit-composer";
import { PhaseBadge } from "@/components/game/phase-badge";
import { ProgramBanner } from "@/components/game/program-banner";
import { RevealPanel } from "@/components/game/reveal-panel";
import { ResultPanel } from "@/components/game/result-panel";
import { RoomActions } from "@/components/game/room-actions";
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

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getPhaseProgress(room: FaultlineRoomAccount, currentSlot: number) {
  if (room.status === ROOM_STATUS.Open && room.playerCount > 0 && Number(room.joinDeadlineSlot) > 0) {
    const duration = Number(room.joinDurationSlots) || 1;
    const remaining = Math.max(Number(room.joinDeadlineSlot) - currentSlot, 0);
    return clampPercent(((duration - remaining) / duration) * 100);
  }

  if (room.status === ROOM_STATUS.Commit && Number(room.commitDeadlineSlot) > 0) {
    const duration = Number(room.commitDurationSlots) || 1;
    const remaining = Math.max(Number(room.commitDeadlineSlot) - currentSlot, 0);
    return clampPercent(((duration - remaining) / duration) * 100);
  }

  if (room.status === ROOM_STATUS.Reveal && Number(room.revealDeadlineSlot) > 0) {
    const duration = Number(room.revealDurationSlots) || 1;
    const remaining = Math.max(Number(room.revealDeadlineSlot) - currentSlot, 0);
    return clampPercent(((duration - remaining) / duration) * 100);
  }

  return room.status === ROOM_STATUS.Resolved ? 100 : 0;
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
          countdownLabel: "Public clock",
          countdown: "Standby",
          urgent: false,
          description: "Empty lane. The first seat starts the public clock.",
          cue: "First entry decides the tempo."
        };
      }

      if (joinRemaining !== null && joinRemaining <= 0 && room.playerCount < room.minPlayers) {
        return {
          phase: "open",
          label: "Reset window is live",
          countdownLabel: "Reset pressure",
          countdown: "Expired",
          urgent: true,
          description: "Minimum seats were missed. Anyone can reset and refund the lane.",
          cue: "Fairness recovery is open."
        };
      }

      return {
        phase: "open",
        label: room.playerCount < room.minPlayers ? "Seats still needed" : "Open pressure building",
        countdownLabel: "Join clock",
        countdown: joinRemaining === null ? "Standby" : formatCountdown(joinRemaining),
        urgent: joinRemaining !== null && joinRemaining <= 30,
        description: "The lane is still filling before commits lock.",
        cue: "Entry still changes the room."
      };
    case ROOM_STATUS.Commit:
      return {
        phase: "commit",
        label: "Private reads locking now",
        countdownLabel: "Commit clock",
        countdown: commitRemaining === null ? "Live" : formatCountdown(commitRemaining),
        urgent: commitRemaining !== null && commitRemaining <= 30,
        description: "Players are sealing their reads. Late adaptation is gone.",
        cue: "Hidden divergence is building."
      };
    case ROOM_STATUS.Reveal:
      return {
        phase: "reveal",
        label: room.revealedCount === room.committedCount ? "Ready to resolve" : "Final truth entering the room",
        countdownLabel: "Reveal clock",
        countdown: revealRemaining === null ? "Live" : formatCountdown(revealRemaining),
        urgent: revealRemaining !== null && revealRemaining <= 30,
        description: "Sealed reads are opening and the final map is forming.",
        cue: "Each reveal can move the payout line."
      };
    case ROOM_STATUS.Resolved:
      return {
        phase: "resolved",
        label: "Outcome fixed on-chain",
        countdownLabel: "Settlement state",
        countdown: "Resolved",
        urgent: false,
        description: "The room is over. Claim, review, or queue the same lane again.",
        cue: "Post-mortem only."
      };
    case ROOM_STATUS.Cancelled:
      return {
        phase: "cancelled",
        label: "Round voided",
        countdownLabel: "Protocol state",
        countdown: "Cancelled",
        urgent: false,
        description: "This round never reached a valid scoring state.",
        cue: "Refund and reopen only."
      };
    default:
      return {
        phase: "emergency",
        label: "Emergency state",
        countdownLabel: "Protocol state",
        countdown: "Paused",
        urgent: false,
        description: "Normal flow is interrupted. Recovery only.",
        cue: "Trust preservation first."
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
  const phaseProgress = getPhaseProgress(room, currentSlot);
  const liveShare = room.distributableLamports > 0n ? room.distributableLamports / BigInt(Math.max(room.winnerCount, 1)) : 0n;
  const seatsLeft = Math.max(room.maxPlayers - room.playerCount, 0);
  const primaryActionHref = showRevealPanel ? "#reveal-panel" : showCommitComposer ? "#commit-composer" : room.status === ROOM_STATUS.Resolved ? "#result-panel" : "#room-actions";
  const primaryActionLabel = showRevealPanel ? "Reveal" : showCommitComposer ? "Commit" : room.status === ROOM_STATUS.Resolved ? "Outcome" : "Actions";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 pb-32 md:px-10 md:pb-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card arena-phase-shell arena-pop-in rounded-[2rem] p-6 sm:p-8" data-phase={phase.phase}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="arena-kicker">Room Detail</p>
            <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
              {preset ? `${preset.name} Arena` : "Faultline Arena Room"} {shortKey(room.publicKey, 6)}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
              {phase.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="arena-live-dot" />
            <span className="arena-chip" data-tone={phase.urgent ? "ember" : "signal"}>{phase.label}</span>
            <PhaseBadge status={room.status} detail={`${room.playerCount}/${room.maxPlayers} seats`} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(room.stakeLamports)}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Seats</p>
            <p className="mt-3 text-2xl text-white">{room.playerCount} / {room.maxPlayers}</p>
          </div>
          <div className="arena-stat rounded-3xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Pot</p>
            <p className="mt-3 text-2xl text-white">{totalPot}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="arena-surface arena-phase-scene arena-grid-glow arena-float-soft rounded-[1.6rem] p-5" data-phase={phase.phase}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="arena-chip" data-tone="signal">
                <Radar className="size-3.5" />
                Live phase
              </span>
              <span className="arena-chip" data-tone="flare">
                {room.committedCount} / {room.playerCount} commits
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">{phase.countdownLabel}</p>
                <p className={cn("mt-2 font-display text-3xl text-white sm:text-4xl", phase.urgent && "arena-urgent-text")}>{phase.countdown}</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/45">
                <span>Phase progress</span>
                <span>{Math.round(phaseProgress)}%</span>
              </div>
              <div className="arena-meter h-2">
                <span style={{ width: `${phaseProgress}%` }} />
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Live share</p>
                <p className="mt-2 text-white">{formatLamports(liveShare)}</p>
              </div>
              <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Seats left</p>
                <p className="mt-2 text-white">{room.playerCount}/{room.maxPlayers} seated, {seatsLeft} left</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 arena-fade-in arena-delay-1">
            <div className="arena-surface rounded-[1.6rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Your seat</p>
              <h2 className="mt-3 font-display text-2xl text-white">{viewerState ? viewerState.label : "Spectating"}</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">{viewerState ? phase.cue : "You are outside the room for now. Join only if you want to commit now."}</p>
              {viewerState ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="arena-chip" data-tone="signal">
                    <BadgeCheck className="size-3.5" />
                    {viewerState.label}
                  </span>
                  <span className="arena-chip">{viewerState.zone}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div id="room-actions" className="scroll-mt-24">
            <RoomActions room={room} currentSlot={currentSlot} playerIndex={playerIndex} onRefresh={refreshRoom} />
          </div>

          {showCommitComposer ? (
            <div id="commit-composer" className="scroll-mt-24">
              <CommitComposer room={room} playerIndex={playerIndex} onCommitted={refreshRoom} />
            </div>
          ) : null}
          {showRevealPanel ? (
            <div id="reveal-panel" className="scroll-mt-24">
              <RevealPanel room={room} onRevealed={refreshRoom} />
            </div>
          ) : null}
          {playerStatus === PLAYER_STATUS.Committed && room.status === ROOM_STATUS.Commit ? (
            <div className="fault-card rounded-[1.75rem] p-6 text-sm leading-7 text-white/68">
              <p className="arena-kicker">Reveal Standby</p>
              <h2 className="mt-3 font-display text-2xl text-white">Your read is sealed.</h2>
              <p className="mt-3">
                Wait for reveal to open, then use the saved proof payload.
              </p>
            </div>
          ) : null}

          <div id="result-panel" className="scroll-mt-24">
            <ResultPanel room={room} playerIndex={playerIndex} roomHref={`/rooms/${room.publicKey.toBase58()}`} />
          </div>
        </div>

        <div className="fault-card rounded-[1.75rem] p-6 arena-fade-in">
          <p className="arena-kicker">Seats</p>
          <h2 className="mt-3 font-display text-2xl text-white">Who is in, and who has revealed.</h2>
          <div className="mt-6 space-y-3">
            {room.playerCount === 0 ? <p className="text-sm text-white/62">No players are seated yet.</p> : null}
            {Array.from({ length: room.playerCount }, (_, index) => (
              <div
                key={room.playerKeys[index].toBase58()}
                className={cn(
                  "arena-seat-card grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[0.12fr_0.36fr_0.22fr_0.3fr] md:items-center",
                  publicKey && room.playerKeys[index].equals(publicKey) && "border-fault-signal/35 bg-fault-signal/6"
                )}
                data-status={PLAYER_STATUS_LABELS[room.playerStatuses[index]]}
              >
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">#{index + 1}</p>
                <p className="break-all text-sm text-white">
                  <a href={`/profile/${room.playerKeys[index].toBase58()}`} className="transition hover:text-fault-flare">
                    {shortKey(room.playerKeys[index], 6)}
                  </a>
                </p>
                <p className="text-sm text-white/70">{PLAYER_STATUS_LABELS[room.playerStatuses[index]]}</p>
                <p className="text-sm text-white/70">
                  {room.playerStatuses[index] === 3 ? `Zone ${ZONE_LABELS[room.playerZones[index]]} · ${RISK_LABELS[room.playerRisks[index]]}` : "Hidden"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="arena-mobile-dock md:hidden">
        <div className="arena-mobile-dock-inner">
          <div className="arena-mobile-dock-copy">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/45">Live room navigation</p>
            <p className="mt-1 truncate font-display text-base text-white">{phase.label}</p>
          </div>
          <a href="#room-actions" className="arena-mobile-pill">
            Board
          </a>
          <a href={primaryActionHref} className="arena-mobile-pill" data-tone="primary">
            {primaryActionLabel}
          </a>
        </div>
      </div>
    </main>
  );
}
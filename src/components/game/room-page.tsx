"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Clock3, Users } from "lucide-react";

import { CommitComposer } from "@/components/game/commit-composer";
import { PhaseBadge } from "@/components/game/phase-badge";
import { ProgramBanner } from "@/components/game/program-banner";
import { ResultPanel } from "@/components/game/result-panel";
import { RoomActions } from "@/components/game/room-actions";
import { AUTOMATION_HEARTBEAT_INTERVAL_MS } from "@/lib/faultline/constants";
import { DEFAULT_ROOM_PRESETS, ROOM_STATUS } from "@/lib/faultline/constants";
import { PLAYER_STATUS_LABELS, RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { findPlayerIndex } from "@/lib/faultline/rooms";
import { deserializeRoomAccount, type SerializedFaultlineRoomAccount } from "@/lib/faultline/transport";
import type { FaultlineRoomAccount, RoomPreset } from "@/lib/faultline/types";
import { formatLamports, shortKey } from "@/lib/utils";

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

export function RoomPage({ roomAddress, initialRoom, initialCurrentSlot = 0, initialPresetId = null, initialError = null }: RoomPageProps) {
  const { publicKey } = useWallet();
  const [room, setRoom] = useState<FaultlineRoomAccount | null>(() => (initialRoom ? deserializeRoomAccount(initialRoom) : null));
  const [currentSlot, setCurrentSlot] = useState(initialCurrentSlot);
  const [presetId, setPresetId] = useState<number | null>(initialPresetId);
  const [error, setError] = useState<string | null>(initialError);

  async function refreshRoom() {
    try {
      const response = await fetch(`/api/rooms/${roomAddress}`, { cache: "no-store" });
      const payload = (await response.json()) as { ok: boolean; error?: string; currentSlot?: number; presetId?: number | null; room?: SerializedFaultlineRoomAccount | null };

      if (!response.ok || !payload.ok || payload.currentSlot === undefined) {
        throw new Error(payload.error || "Lecture de room impossible.");
      }

      setCurrentSlot(payload.currentSlot);
      setPresetId(payload.presetId ?? null);
      setRoom(payload.room ? deserializeRoomAccount(payload.room) : null);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Lecture de room impossible.");
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
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">System Lobby</p>
              <h1 className="mt-3 font-display text-4xl text-white">{preset.name} pret a etre initialise</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
                Aucun compte de room n&apos;est encore actif pour ce preset. La premiere transaction de jeu cree la room si besoin, puis join et commit dans le meme envoi wallet.
              </p>
            </div>
            <div className="rounded-full border border-white/12 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/72">
              {preset.minPlayers}-{preset.maxPlayers} joueurs
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
              <p className="mt-3 text-2xl text-white">{formatLamports(BigInt(preset.stakeLamports))}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Join window</p>
              <p className="mt-3 text-2xl text-white">{preset.joinWindowSlots} slots</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Room Detail</p>
            <h1 className="mt-3 font-display text-4xl text-white">Faultline room {shortKey(room.publicKey, 6)}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
              Room permissionless sur Solana devnet. Le premier joueur l'ouvre depuis son wallet, puis n'importe quel visiteur peut rejoindre et declencher les actions de phase necessaires.
            </p>
          </div>
          <PhaseBadge status={room.status} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Stake</p>
            <p className="mt-3 text-2xl text-white">{formatLamports(room.stakeLamports)}</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Players</p>
            <p className="mt-3 inline-flex items-center gap-2 text-2xl text-white">
              <Users className="size-5 text-fault-flare" />
              {room.playerCount} / {room.maxPlayers}
            </p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commits / Reveals</p>
            <p className="mt-3 text-2xl text-white">{room.committedCount} / {room.revealedCount}</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Current slot</p>
            <p className="mt-3 inline-flex items-center gap-2 text-2xl text-white">
              <Clock3 className="size-5 text-fault-flare" />
              {currentSlot}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <RoomActions room={room} currentSlot={currentSlot} playerIndex={playerIndex} onRefresh={refreshRoom} />

        <div className="space-y-6">
          <div className="fault-card rounded-[1.75rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Spectator Board</p>
            <h2 className="mt-3 font-display text-2xl text-white">Etat des participants</h2>
            <div className="mt-6 space-y-3">
              {Array.from({ length: room.playerCount }, (_, index) => (
                <div key={room.playerKeys[index].toBase58()} className="grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[0.34fr_0.18fr_0.18fr_0.3fr] md:items-center">
                  <p className="text-sm text-white">{shortKey(room.playerKeys[index], 6)}</p>
                  <p className="text-sm text-white/70">{PLAYER_STATUS_LABELS[room.playerStatuses[index]]}</p>
                  <p className="text-sm text-white/70">{room.playerStatuses[index] === 3 ? `Zone ${ZONE_LABELS[room.playerZones[index]]}` : "opaque"}</p>
                  <p className="text-sm text-white/70">{room.playerStatuses[index] === 3 ? RISK_LABELS[room.playerRisks[index]] : "en attente de reveal"}</p>
                </div>
              ))}
            </div>
          </div>

          <ResultPanel room={room} playerIndex={playerIndex} />
        </div>
      </section>
    </main>
  );
}
"use client";

import { useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Ban, Coins, Gavel, LoaderCircle, LockKeyhole, Sparkle, TimerReset } from "lucide-react";

import { CommitComposer } from "@/components/game/commit-composer";
import { RevealPanel } from "@/components/game/reveal-panel";
import { useToast } from "@/components/ui/toast-provider";
import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import {
  createCancelExpiredRoomIx,
  createClaimRewardIx,
  createForceTimeoutIx,
  createResolveGameIx
} from "@/lib/faultline/instructions";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm } from "@/lib/solana/transactions";
import { cn, formatCountdown, formatLamports } from "@/lib/utils";

function ActionButton({
  title,
  icon: Icon,
  onClick,
  pending,
  disabled
}: {
  title: string;
  icon: typeof Sparkle;
  onClick: () => Promise<void>;
  pending: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={pending || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition",
        "border-white/10 bg-white/5 text-white/78 hover:border-white/25 hover:bg-white/10",
        "disabled:cursor-not-allowed disabled:opacity-40"
      )}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {title}
    </button>
  );
}

export function RoomActions({
  room,
  currentSlot,
  playerIndex,
  onRefresh
}: {
  room: FaultlineRoomAccount;
  currentSlot: number;
  playerIndex: number;
  onRefresh: () => Promise<void>;
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const programId = getFaultlineProgramId();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const isJoined = playerIndex >= 0;
  const playerStatus = isJoined ? room.playerStatuses[playerIndex] : PLAYER_STATUS.Empty;
  const reward = isJoined ? room.playerRewardsLamports[playerIndex] : 0n;
  const claimed = isJoined ? room.playerClaimed[playerIndex] : false;
  const isSettledRoom =
    room.status === ROOM_STATUS.Resolved || room.status === ROOM_STATUS.Cancelled || room.status === ROOM_STATUS.Emergency;
  const isPendingCancellation =
    room.status === ROOM_STATUS.Open && room.playerCount > 0 && Number(room.joinDeadlineSlot) > 0 && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers;
  const canComposeEntry =
    room.status === ROOM_STATUS.Open &&
    room.playerCount < room.maxPlayers &&
    (room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 || currentSlot <= Number(room.joinDeadlineSlot) || isPendingCancellation);
  const canCancel = isPendingCancellation;
  const canForceTimeout =
    (room.status === ROOM_STATUS.Commit && currentSlot > Number(room.commitDeadlineSlot)) ||
    (room.status === ROOM_STATUS.Reveal && currentSlot > Number(room.revealDeadlineSlot));
  const canResolve =
    room.status !== ROOM_STATUS.Resolved &&
    room.status !== ROOM_STATUS.Cancelled &&
    ((room.status === ROOM_STATUS.Reveal && room.revealedCount === room.committedCount) ||
      (room.status === ROOM_STATUS.Reveal && currentSlot > Number(room.revealDeadlineSlot)) ||
      (room.status === ROOM_STATUS.Commit && room.committedCount === room.playerCount));
  const availableActions = [canCancel, canForceTimeout, canResolve, isJoined && reward > 0n && !claimed && isSettledRoom].filter(Boolean).length;
  const nextWindowLabel = canCancel
    ? "Join window expired below the minimum players threshold."
    : canForceTimeout
      ? "A deadline expired and the room can be advanced right now."
      : canResolve
        ? "All required inputs are in, so the room can be resolved permissionlessly."
        : "Waiting for the next gameplay event or deadline to unlock an action.";
  async function execute(label: string, builder: () => Promise<Transaction>) {
    if (!programId || !publicKey || !sendTransaction) {
      toast({
        tone: "error",
        title: "Wallet required",
        description: "Connect a wallet and ensure the Faultline program ID is configured before sending a room action."
      });
      return;
    }

    try {
      setPending(label);
      const transaction = await builder();
      await sendAndConfirm(connection, sendTransaction, publicKey, transaction);
      await onRefresh();
      toast({
        tone: "success",
        title: `${label} confirmed`,
        description: "The room state has been updated from confirmed Solana data."
      });
    } catch (error) {
      toast({
        tone: "error",
        title: `${label} failed`,
        description: error instanceof Error ? error.message : `The ${label.toLowerCase()} transaction could not be completed.`
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="fault-card rounded-[1.75rem] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="arena-kicker">Room Actions</p>
            <h2 className="mt-3 font-display text-2xl text-white">Advance, settle, or harvest the room without admin privileges.</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/68">
            Network slot {currentSlot}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="arena-surface arena-grid-glow rounded-[1.5rem] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="arena-chip" data-tone="signal">
                <TimerReset className="size-3.5" />
                {availableActions} live action{availableActions === 1 ? "" : "s"}
              </span>
              {isJoined ? (
                <span className="arena-chip" data-tone="flare">
                  <LockKeyhole className="size-3.5" />
                  Your potential payout {reward > 0n ? formatLamports(reward) : "pending"}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-white/68">{nextWindowLabel}</p>
          </div>

          <div className="arena-surface rounded-[1.5rem] p-4 text-sm text-white/68">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Permissionless model</p>
            <p className="mt-3 leading-7">
              Anyone can move expired rooms forward. The flow stays trust-minimized even if the original players leave the page.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {canCancel ? (
            <ActionButton
              title="Cancel expired"
              icon={Ban}
              pending={pending === "Cancel"}
              onClick={async () => {
                await execute(
                  "Cancel",
                  async () =>
                    new Transaction().add(
                      await createCancelExpiredRoomIx({
                        programId: programId!,
                        caller: publicKey!,
                        room: room.publicKey,
                        refundPlayers: room.playerKeys.slice(0, room.playerCount)
                      })
                    )
                );
              }}
            />
          ) : null}

          {canForceTimeout ? (
            <ActionButton
              title="Force timeout"
              icon={Gavel}
              pending={pending === "Timeout"}
              onClick={async () => {
                await execute(
                  "Timeout",
                  async () =>
                    new Transaction().add(
                      await createForceTimeoutIx({
                        programId: programId!,
                        caller: publicKey!,
                        room: room.publicKey,
                        refundPlayers: room.playerKeys.slice(0, room.playerCount)
                      })
                    )
                );
              }}
            />
          ) : null}

          {canResolve ? (
            <ActionButton
              title="Resolve"
              icon={Sparkle}
              pending={pending === "Resolve"}
              onClick={async () => {
                await execute(
                  "Resolve",
                  async () => new Transaction().add(await createResolveGameIx({ programId: programId!, caller: publicKey!, room: room.publicKey, treasury: room.treasury }))
                );
              }}
            />
          ) : null}

          {isJoined && reward > 0n && !claimed && isSettledRoom ? (
            <ActionButton
              title="Claim reward"
              icon={Coins}
              pending={pending === "Claim"}
              onClick={async () => {
                await execute("Claim", async () => new Transaction().add(await createClaimRewardIx({ programId: programId!, player: publicKey!, room: room.publicKey })));
              }}
            />
          ) : null}

        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="arena-stat arena-fade-in rounded-2xl p-4 text-sm text-white/72">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Join deadline</p>
            <p className="mt-2 text-white">{room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 ? "starts with the next entrant" : formatCountdown(Number(room.joinDeadlineSlot) - currentSlot)}</p>
          </div>
          <div className="arena-stat arena-fade-in arena-delay-1 rounded-2xl p-4 text-sm text-white/72">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commit deadline</p>
            <p className="mt-2 text-white">{Number(room.commitDeadlineSlot) > 0 ? formatCountdown(Number(room.commitDeadlineSlot) - currentSlot) : "waiting"}</p>
          </div>
          <div className="arena-stat arena-fade-in arena-delay-2 rounded-2xl p-4 text-sm text-white/72">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Reveal deadline</p>
            <p className="mt-2 text-white">{Number(room.revealDeadlineSlot) > 0 ? formatCountdown(Number(room.revealDeadlineSlot) - currentSlot) : "waiting"}</p>
          </div>
        </div>
      </div>

      {!isJoined && canComposeEntry ? (
        <CommitComposer room={room} playerIndex={-1} onCommitted={onRefresh} />
      ) : null}

      {isJoined && playerStatus === PLAYER_STATUS.Joined && (room.status === ROOM_STATUS.Open || room.status === ROOM_STATUS.Commit) ? (
        <CommitComposer room={room} playerIndex={playerIndex} onCommitted={onRefresh} />
      ) : null}

      {isJoined && playerStatus === PLAYER_STATUS.Committed && (room.status === ROOM_STATUS.Commit || room.status === ROOM_STATUS.Reveal) ? (
        <RevealPanel room={room} onRevealed={onRefresh} />
      ) : null}
    </div>
  );
}
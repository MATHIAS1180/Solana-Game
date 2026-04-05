"use client";

import { useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Ban, Coins, Gavel, LoaderCircle, LockKeyhole, Sparkle } from "lucide-react";

import { TransactionSpeedControl } from "@/components/game/transaction-speed-control";
import { Countdown } from "@/components/ui/countdown";
import { PhaseBadge } from "@/components/game/phase-badge";
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
import { sendAndConfirm, type TransactionSpeed } from "@/lib/solana/transactions";
import { cn, formatLamports } from "@/lib/utils";

function getDeadlineUrgency(remaining: number | null) {
  if (remaining === null) {
    return "steady";
  }

  if (remaining <= 0) {
    return "expired";
  }

  if (remaining <= 30) {
    return "critical";
  }

  if (remaining <= 75) {
    return "hot";
  }

  return "steady";
}

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
  const [transactionSpeed, setTransactionSpeed] = useState<TransactionSpeed>("balanced");

  const isJoined = playerIndex >= 0;
  const playerStatus = isJoined ? room.playerStatuses[playerIndex] : PLAYER_STATUS.Empty;
  const reward = isJoined ? room.playerRewardsLamports[playerIndex] : 0n;
  const claimed = isJoined ? room.playerClaimed[playerIndex] : false;
  const isSettledRoom =
    room.status === ROOM_STATUS.Resolved || room.status === ROOM_STATUS.Cancelled || room.status === ROOM_STATUS.Emergency;
  const isPendingCancellation =
    room.status === ROOM_STATUS.Open && room.playerCount > 0 && Number(room.joinDeadlineSlot) > 0 && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers;
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
  const joinRemaining = room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 ? null : Number(room.joinDeadlineSlot) - currentSlot;
  const commitRemaining = Number(room.commitDeadlineSlot) > 0 ? Number(room.commitDeadlineSlot) - currentSlot : null;
  const revealRemaining = Number(room.revealDeadlineSlot) > 0 ? Number(room.revealDeadlineSlot) - currentSlot : null;
  const liveWindowRemaining = room.status === ROOM_STATUS.Open ? joinRemaining : room.status === ROOM_STATUS.Commit ? commitRemaining : room.status === ROOM_STATUS.Reveal ? revealRemaining : null;
  const liveWindowUrgency = getDeadlineUrgency(liveWindowRemaining);
  const availableActions = [canCancel, canForceTimeout, canResolve, isJoined && reward > 0n && !claimed && isSettledRoom].filter(Boolean).length;
  const nextWindowLabel = canCancel
    ? "Join window expired below the minimum threshold. Anyone can cancel now and push refunds back to players."
    : canForceTimeout
      ? "A deadline expired. The next actor can force the room forward immediately instead of waiting on absent players."
      : canResolve
        ? "The room has enough information to score the outcome. Resolution is open to anyone."
        : "No forced action is open yet. The next unlock comes from a fresh commit, a reveal, or an expired timer.";
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
      await sendAndConfirm(connection, sendTransaction, publicKey, transaction, {
        speed: transactionSpeed,
        maxAttempts: transactionSpeed === "aggressive" ? 3 : transactionSpeed === "balanced" ? 2 : 1
      });
      await onRefresh();
      toast({
        tone: "game",
        title: `${label} confirmed`,
        description: "The room state has been refreshed from confirmed Solana data."
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
    <div id="room-actions" className="space-y-6">
      <div className="fault-card rounded-[1.75rem] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="arena-kicker">Room Actions</p>
            <h2 className="mt-3 font-display text-2xl text-white">Only the actions that matter right now.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              If a timer expires, anyone can move the room forward. If you cashed, claim here.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PhaseBadge status={room.status} detail={`${availableActions} action${availableActions === 1 ? "" : "s"}`} compact />
            <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/68">Network slot {currentSlot}</div>
          </div>
        </div>

        <div className="mt-6 arena-surface arena-grid-glow arena-live-clock-shell rounded-[1.5rem] p-4" data-urgency={liveWindowUrgency}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="arena-chip" data-tone="signal">{availableActions} live action{availableActions === 1 ? "" : "s"}</span>
            <span className="arena-chip" data-tone={liveWindowUrgency === "critical" || liveWindowUrgency === "expired" ? "ember" : "flare"}>
              {room.status === ROOM_STATUS.Open ? "Join" : room.status === ROOM_STATUS.Commit ? "Commit" : room.status === ROOM_STATUS.Reveal ? "Reveal" : "Settled"}
            </span>
            {isJoined ? (
              <span className="arena-chip" data-tone="flare">
                <LockKeyhole className="size-3.5" />
                {reward > 0n ? `Claim ${formatLamports(reward)}` : "Seat active"}
              </span>
            ) : null}
          </div>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-white/45">Live clock</p>
          <p className={cn("mt-3 font-display text-3xl text-white", liveWindowUrgency === "critical" && "arena-urgent-text", liveWindowUrgency === "hot" && "arena-hot-text")}>
            {liveWindowRemaining === null ? "No live clock" : <Countdown targetSlot={currentSlot + liveWindowRemaining} currentSlot={currentSlot} urgencyAt={75} />}
          </p>
          <p className="mt-4 text-sm leading-7 text-white/68">{nextWindowLabel}</p>
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
                  async () => new Transaction().add(await createResolveGameIx({ programId: programId!, caller: publicKey!, room: room.publicKey }))
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

        <div className="mt-6">
          <TransactionSpeedControl value={transactionSpeed} onChange={setTransactionSpeed} compact />
        </div>
      </div>
    </div>
  );
}
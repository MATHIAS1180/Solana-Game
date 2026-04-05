"use client";

import { useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Ban, Coins, Gavel, LoaderCircle, Sparkle } from "lucide-react";

import { CommitComposer } from "@/components/game/commit-composer";
import { RevealPanel } from "@/components/game/reveal-panel";
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
import { formatCountdown } from "@/lib/utils";

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
      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/78 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isJoined = playerIndex >= 0;
  const playerStatus = isJoined ? room.playerStatuses[playerIndex] : PLAYER_STATUS.Empty;
  const reward = isJoined ? room.playerRewardsLamports[playerIndex] : 0n;
  const claimed = isJoined ? room.playerClaimed[playerIndex] : false;
  const isSettledRoom =
    room.status === ROOM_STATUS.Resolved || room.status === ROOM_STATUS.Cancelled || room.status === ROOM_STATUS.Emergency;
  const canJoinOpenRoom =
    room.status === ROOM_STATUS.Open &&
    room.playerCount < room.maxPlayers &&
    (room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 || currentSlot <= Number(room.joinDeadlineSlot));
  const canCancel =
    room.status === ROOM_STATUS.Open && room.playerCount > 0 && Number(room.joinDeadlineSlot) > 0 && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers;
  const canForceTimeout =
    (room.status === ROOM_STATUS.Commit && currentSlot > Number(room.commitDeadlineSlot)) ||
    (room.status === ROOM_STATUS.Reveal && currentSlot > Number(room.revealDeadlineSlot));
  const canResolve =
    room.status !== ROOM_STATUS.Resolved &&
    room.status !== ROOM_STATUS.Cancelled &&
    ((room.status === ROOM_STATUS.Reveal && room.revealedCount === room.committedCount) ||
      (room.status === ROOM_STATUS.Reveal && currentSlot > Number(room.revealDeadlineSlot)) ||
      (room.status === ROOM_STATUS.Commit && room.committedCount === room.playerCount));
  async function execute(label: string, builder: () => Promise<Transaction>) {
    if (!programId || !publicKey || !sendTransaction) {
      setMessage("Wallet non connecte ou Program ID absent.");
      return;
    }

    try {
      setPending(label);
      setMessage(null);
      const transaction = await builder();
      await sendAndConfirm(connection, sendTransaction, publicKey, transaction);
      await onRefresh();
      setMessage(`${label} confirme.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} echoue.`);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="fault-card rounded-[1.75rem] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Room Actions</p>
            <h2 className="mt-3 font-display text-2xl text-white">Agir sur la room de maniere permissionless</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/68">
            Slot actuel {currentSlot}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {canCancel ? (
            <ActionButton
              title="Cancel Expired"
              icon={Ban}
              pending={pending === "Cancel"}
              onClick={async () => {
                await execute("Cancel", async () => new Transaction().add(await createCancelExpiredRoomIx({ programId: programId!, caller: publicKey!, room: room.publicKey })));
              }}
            />
          ) : null}

          {canForceTimeout ? (
            <ActionButton
              title="Force Timeout"
              icon={Gavel}
              pending={pending === "Timeout"}
              onClick={async () => {
                await execute("Timeout", async () => new Transaction().add(await createForceTimeoutIx({ programId: programId!, caller: publicKey!, room: room.publicKey })));
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
              title="Claim"
              icon={Coins}
              pending={pending === "Claim"}
              onClick={async () => {
                await execute("Claim", async () => new Transaction().add(await createClaimRewardIx({ programId: programId!, player: publicKey!, room: room.publicKey })));
              }}
            />
          ) : null}

        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/72">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Join deadline</p>
            <p className="mt-2 text-white">{room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 ? "demarre au prochain joueur" : formatCountdown(Number(room.joinDeadlineSlot) - currentSlot)}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/72">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commit deadline</p>
            <p className="mt-2 text-white">{Number(room.commitDeadlineSlot) > 0 ? formatCountdown(Number(room.commitDeadlineSlot) - currentSlot) : "en attente"}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/72">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Reveal deadline</p>
            <p className="mt-2 text-white">{Number(room.revealDeadlineSlot) > 0 ? formatCountdown(Number(room.revealDeadlineSlot) - currentSlot) : "en attente"}</p>
          </div>
        </div>

        {message ? <p className="mt-5 text-sm text-white/72">{message}</p> : null}
      </div>

      {!isJoined && canJoinOpenRoom ? (
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
import "server-only";

import { PublicKey, Transaction } from "@solana/web3.js";

import { AUTOMATION_HEARTBEAT_INTERVAL_MS, PLAYER_STATUS, ROOM_STATUS, matchesDefaultRoomPreset } from "@/lib/faultline/constants";
import {
  createCancelExpiredRoomIx,
  createClaimRewardIx,
  createCloseRoomIx,
  createForceTimeoutIx,
  createResolveGameIx,
  createRevealDecisionIx
} from "@/lib/faultline/instructions";
import { deriveProfilePda } from "@/lib/faultline/pdas";
import { claimAutomationHeartbeatLock, deleteAutomationCommitPayload, getAutomationCommitPayload } from "@/lib/faultline/automation-store";
import { fetchRoom, fetchRooms } from "@/lib/faultline/rooms";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { getRelayerPublicKey, getServerConnection, getServerProgramId, sendRelayerTransaction } from "@/lib/solana/server";

type AutomationSummary = {
  processedRooms: number;
  transactionCount: number;
  actions: string[];
  errors: string[];
};

type AutomationHeartbeatSummary = AutomationSummary & {
  triggered: boolean;
};

function isSettledRoom(room: FaultlineRoomAccount) {
  return room.status === ROOM_STATUS.Resolved || room.status === ROOM_STATUS.Cancelled || room.status === ROOM_STATUS.Emergency;
}

function hasCommittedPlayers(room: FaultlineRoomAccount) {
  for (let index = 0; index < room.playerCount; index += 1) {
    if (room.playerStatuses[index] === PLAYER_STATUS.Committed) {
      return true;
    }
  }

  return false;
}

function hasPendingClaims(room: FaultlineRoomAccount) {
  for (let index = 0; index < room.playerCount; index += 1) {
    if (room.playerRewardsLamports[index] > 0n && !room.playerClaimed[index]) {
      return true;
    }
  }

  return false;
}

function maxActionsPerRun() {
  const parsed = Number(process.env.FAULTLINE_AUTOMATION_MAX_ACTIONS || "25");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

export async function runAutomationTick(): Promise<AutomationSummary> {
  const connection = getServerConnection();
  const programId = getServerProgramId();
  const relayer = getRelayerPublicKey();
  const rooms = (await fetchRooms(connection, programId)).filter((room) => matchesDefaultRoomPreset(room));
  const summary: AutomationSummary = {
    processedRooms: rooms.length,
    transactionCount: 0,
    actions: [],
    errors: []
  };
  const maxActions = maxActionsPerRun();
  summary.processedRooms = rooms.length;

  async function refresh(roomKey: PublicKey) {
    return fetchRoom(connection, roomKey);
  }

  async function execute(label: string, roomKey: PublicKey, buildTransaction: () => Promise<Transaction>) {
    if (summary.transactionCount >= maxActions) {
      return refresh(roomKey);
    }

    try {
      const signature = await sendRelayerTransaction(await buildTransaction());
      summary.transactionCount += 1;
      summary.actions.push(`${label}:${roomKey.toBase58()}:${signature}`);
    } catch (error) {
      summary.errors.push(`${label}:${roomKey.toBase58()}:${error instanceof Error ? error.message : "Erreur inconnue"}`);
    }

    return refresh(roomKey);
  }

  for (const initialRoom of rooms) {
    if (summary.transactionCount >= maxActions) {
      break;
    }

    let room: FaultlineRoomAccount | null = initialRoom;
    let currentSlot = await connection.getSlot("confirmed");

    if (room.status === ROOM_STATUS.Open && currentSlot > Number(room.joinDeadlineSlot) && room.playerCount < room.minPlayers) {
      room = await execute("cancel-expired", room.publicKey, async () => {
        return new Transaction().add(await createCancelExpiredRoomIx({ programId, caller: relayer, room: room!.publicKey }));
      });
    }

    if (!room || summary.transactionCount >= maxActions) {
      continue;
    }

    currentSlot = await connection.getSlot("confirmed");
    if (room.status === ROOM_STATUS.Commit && currentSlot > Number(room.commitDeadlineSlot)) {
      room = await execute("force-timeout-commit", room.publicKey, async () => {
        return new Transaction().add(await createForceTimeoutIx({ programId, caller: relayer, room: room!.publicKey }));
      });
    }

    if (!room || summary.transactionCount >= maxActions) {
      continue;
    }

    if (room?.status === ROOM_STATUS.Reveal) {
      for (let index = 0; room && index < room.playerCount; index += 1) {
        if (summary.transactionCount >= maxActions || room.status !== ROOM_STATUS.Reveal) {
          break;
        }
        if (room.playerStatuses[index] !== PLAYER_STATUS.Committed) {
          continue;
        }

        const player = room.playerKeys[index];
        const storedPayload = await getAutomationCommitPayload(room.publicKey.toBase58(), player.toBase58());
        if (!storedPayload) {
          continue;
        }

        const [profile] = await deriveProfilePda(programId, player);
        room = await execute(`auto-reveal:${player.toBase58()}`, room.publicKey, async () => {
          return new Transaction().add(
            createRevealDecisionIx({
              programId,
              player,
              room: room!.publicKey,
              profile,
              zone: storedPayload.zone,
              riskBand: storedPayload.riskBand,
              forecast: storedPayload.forecast,
              nonce: Uint8Array.from(storedPayload.nonce)
            })
          );
        });

        if (room?.playerStatuses[index] === PLAYER_STATUS.Revealed) {
          await deleteAutomationCommitPayload(room.publicKey.toBase58(), player.toBase58());
        }
      }

      if (!room || summary.transactionCount >= maxActions) {
        continue;
      }

      currentSlot = await connection.getSlot("confirmed");
      if (room.status === ROOM_STATUS.Reveal && currentSlot > Number(room.revealDeadlineSlot) && hasCommittedPlayers(room)) {
        room = await execute("force-timeout-reveal", room.publicKey, async () => {
          return new Transaction().add(await createForceTimeoutIx({ programId, caller: relayer, room: room!.publicKey }));
        });
      }

      if (!room || summary.transactionCount >= maxActions) {
        continue;
      }

      if (room.status === ROOM_STATUS.Reveal && !hasCommittedPlayers(room)) {
        room = await execute("resolve", room.publicKey, async () => {
          return new Transaction().add(
            await createResolveGameIx({
              programId,
              caller: relayer,
              room: room!.publicKey,
              treasury: room!.treasury
            })
          );
        });
      }
    }

    if (!room || summary.transactionCount >= maxActions) {
      continue;
    }

    if (room && isSettledRoom(room)) {
      for (let index = 0; room && index < room.playerCount; index += 1) {
        if (summary.transactionCount >= maxActions) {
          break;
        }
        if (room.playerRewardsLamports[index] === 0n || room.playerClaimed[index]) {
          continue;
        }

        const player = room.playerKeys[index];
        room = await execute(`claim:${player.toBase58()}`, room.publicKey, async () => {
          return new Transaction().add(await createClaimRewardIx({ programId, player, room: room!.publicKey }));
        });

        if (!room || !isSettledRoom(room)) {
          break;
        }
      }

      if (room && summary.transactionCount < maxActions && isSettledRoom(room) && !hasPendingClaims(room)) {
        await execute("close-room", room.publicKey, async () => {
          return new Transaction().add(await createCloseRoomIx({ programId, caller: relayer, room: room!.publicKey }));
        });
      }
    }
  }

  return summary;
}

export async function runAutomationHeartbeat(): Promise<AutomationHeartbeatSummary> {
  const interval = Number(process.env.FAULTLINE_AUTOMATION_HEARTBEAT_INTERVAL_MS || AUTOMATION_HEARTBEAT_INTERVAL_MS);
  const lockClaimed = await claimAutomationHeartbeatLock(interval);

  if (!lockClaimed) {
    return {
      triggered: false,
      processedRooms: 0,
      transactionCount: 0,
      actions: [],
      errors: []
    };
  }

  const summary = await runAutomationTick();
  return {
    triggered: true,
    ...summary
  };
}
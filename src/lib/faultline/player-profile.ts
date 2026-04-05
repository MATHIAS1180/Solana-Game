import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";

export type PlayerBoardLine = {
  roomAddress: string;
  stakeLamports: bigint;
  roomStatus: number;
  playerStatus: number;
  zone: number | null;
  riskBand: number | null;
  rewardLamports: bigint;
  claimed: boolean;
  error: number | null;
  scoreBps: number | null;
  createdSlot: bigint;
  resolveSlot: bigint;
};

export type PlayerBoardSnapshot = {
  wallet: string;
  currentSlot: number;
  lines: PlayerBoardLine[];
  activeLines: PlayerBoardLine[];
  settledLines: PlayerBoardLine[];
  activeSeats: number;
  committedSeats: number;
  revealedSeats: number;
  wins: number;
  livePressureLamports: bigint;
  totalPayoutLamports: bigint;
  hottestStakeLamports: bigint;
  averageError: number | null;
};

export function buildPlayerBoardSnapshot(rooms: FaultlineRoomAccount[], wallet: string, currentSlot: number): PlayerBoardSnapshot {
  const lines: PlayerBoardLine[] = [];

  for (const room of rooms) {
    for (let index = 0; index < room.playerCount; index += 1) {
      if (room.playerKeys[index].toBase58() !== wallet) {
        continue;
      }

      const playerStatus = room.playerStatuses[index];
      const revealed = playerStatus === PLAYER_STATUS.Revealed;

      lines.push({
        roomAddress: room.publicKey.toBase58(),
        stakeLamports: room.stakeLamports,
        roomStatus: room.status,
        playerStatus,
        zone: revealed ? room.playerZones[index] : null,
        riskBand: revealed ? room.playerRisks[index] : null,
        rewardLamports: room.playerRewardsLamports[index] ?? 0n,
        claimed: room.playerClaimed[index] ?? false,
        error: revealed ? room.playerErrors[index] ?? 0 : null,
        scoreBps: revealed ? room.playerScoresBps[index] ?? 0 : null,
        createdSlot: room.createdSlot,
        resolveSlot: room.resolveSlot
      });
    }
  }

  const activeLines = lines
    .filter((line) => line.roomStatus === ROOM_STATUS.Open || line.roomStatus === ROOM_STATUS.Commit || line.roomStatus === ROOM_STATUS.Reveal)
    .sort((left, right) => rankActiveLine(right) - rankActiveLine(left) || Number(right.stakeLamports - left.stakeLamports));

  const settledLines = lines
    .filter((line) => line.roomStatus === ROOM_STATUS.Resolved || line.roomStatus === ROOM_STATUS.Cancelled || line.roomStatus === ROOM_STATUS.Emergency)
    .sort((left, right) => Number(right.resolveSlot - left.resolveSlot) || Number(right.stakeLamports - left.stakeLamports));

  const revealedLines = lines.filter((line) => line.error !== null);

  return {
    wallet,
    currentSlot,
    lines,
    activeLines,
    settledLines,
    activeSeats: activeLines.length,
    committedSeats: lines.filter((line) => line.playerStatus === PLAYER_STATUS.Committed).length,
    revealedSeats: lines.filter((line) => line.playerStatus === PLAYER_STATUS.Revealed).length,
    wins: lines.filter((line) => line.rewardLamports > 0n).length,
    livePressureLamports: activeLines.reduce((sum, line) => sum + line.stakeLamports, 0n),
    totalPayoutLamports: lines.reduce((sum, line) => sum + line.rewardLamports, 0n),
    hottestStakeLamports: lines.reduce((highest, line) => (line.stakeLamports > highest ? line.stakeLamports : highest), 0n),
    averageError: revealedLines.length > 0 ? revealedLines.reduce((sum, line) => sum + (line.error ?? 0), 0) / revealedLines.length : null
  };
}

function rankActiveLine(line: PlayerBoardLine) {
  if (line.roomStatus === ROOM_STATUS.Reveal) {
    return 300;
  }
  if (line.roomStatus === ROOM_STATUS.Commit) {
    return 220;
  }
  if (line.playerStatus === PLAYER_STATUS.Joined) {
    return 140;
  }
  return 80;
}
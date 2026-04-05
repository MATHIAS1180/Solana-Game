import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";

export type LiveRivalryEntry = {
  wallet: string;
  score: number;
  lanes: number;
  activeSeats: number;
  committedSeats: number;
  revealedSeats: number;
  wins: number;
  livePressureLamports: bigint;
  payoutLamports: bigint;
  hottestStakeLamports: bigint;
  averageError: number | null;
};

type MutableRivalryEntry = {
  wallet: string;
  score: number;
  lanes: number;
  activeSeats: number;
  committedSeats: number;
  revealedSeats: number;
  wins: number;
  livePressureLamports: bigint;
  payoutLamports: bigint;
  hottestStakeLamports: bigint;
  totalError: number;
  errorSamples: number;
};

function isLiveRoom(room: FaultlineRoomAccount) {
  return room.status === ROOM_STATUS.Open || room.status === ROOM_STATUS.Commit || room.status === ROOM_STATUS.Reveal;
}

function isActiveSeat(status: number) {
  return status === PLAYER_STATUS.Joined || status === PLAYER_STATUS.Committed || status === PLAYER_STATUS.Revealed;
}

function getOrCreateEntry(board: Map<string, MutableRivalryEntry>, wallet: string) {
  const existing = board.get(wallet);
  if (existing) {
    return existing;
  }

  const created: MutableRivalryEntry = {
    wallet,
    score: 0,
    lanes: 0,
    activeSeats: 0,
    committedSeats: 0,
    revealedSeats: 0,
    wins: 0,
    livePressureLamports: 0n,
    payoutLamports: 0n,
    hottestStakeLamports: 0n,
    totalError: 0,
    errorSamples: 0
  };
  board.set(wallet, created);
  return created;
}

export function buildLiveRivalryBoard(rooms: FaultlineRoomAccount[]) {
  const board = new Map<string, MutableRivalryEntry>();

  for (const room of rooms) {
    for (let index = 0; index < room.playerCount; index += 1) {
      const wallet = room.playerKeys[index]?.toBase58();
      if (!wallet) {
        continue;
      }

      const entry = getOrCreateEntry(board, wallet);
      const status = room.playerStatuses[index];
      const reward = room.playerRewardsLamports[index] ?? 0n;
      entry.lanes += 1;

      if (isLiveRoom(room) && isActiveSeat(status)) {
        entry.activeSeats += 1;
        entry.livePressureLamports += room.stakeLamports;
        entry.hottestStakeLamports = entry.hottestStakeLamports > room.stakeLamports ? entry.hottestStakeLamports : room.stakeLamports;
        entry.score += 16 + Number(room.stakeLamports / 20_000_000n);

        if (room.status === ROOM_STATUS.Reveal) {
          entry.score += 28;
        } else if (room.status === ROOM_STATUS.Commit) {
          entry.score += 18;
        } else {
          entry.score += 10;
        }
      }

      if (status === PLAYER_STATUS.Committed) {
        entry.committedSeats += 1;
        entry.score += 12;
      }

      if (status === PLAYER_STATUS.Revealed) {
        entry.revealedSeats += 1;
        entry.totalError += room.playerErrors[index] ?? 0;
        entry.errorSamples += 1;
        entry.score += 16;
      }

      if (reward > 0n) {
        entry.wins += 1;
        entry.payoutLamports += reward;
        entry.score += 30 + Number(reward / 10_000_000n);
      }
    }
  }

  return [...board.values()]
    .map<LiveRivalryEntry>((entry) => ({
      wallet: entry.wallet,
      score: entry.score,
      lanes: entry.lanes,
      activeSeats: entry.activeSeats,
      committedSeats: entry.committedSeats,
      revealedSeats: entry.revealedSeats,
      wins: entry.wins,
      livePressureLamports: entry.livePressureLamports,
      payoutLamports: entry.payoutLamports,
      hottestStakeLamports: entry.hottestStakeLamports,
      averageError: entry.errorSamples > 0 ? entry.totalError / entry.errorSamples : null
    }))
    .filter((entry) => entry.activeSeats > 0 || entry.payoutLamports > 0n || entry.revealedSeats > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.payoutLamports !== left.payoutLamports) {
        return right.payoutLamports > left.payoutLamports ? 1 : -1;
      }
      if (right.livePressureLamports !== left.livePressureLamports) {
        return right.livePressureLamports > left.livePressureLamports ? 1 : -1;
      }
      return right.activeSeats - left.activeSeats;
    });
}

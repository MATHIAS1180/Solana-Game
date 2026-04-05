import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import { scoreResolvedRoom } from "@/lib/faultline/logic";
import type { FaultlineRoomAccount, Forecast } from "@/lib/faultline/types";

export type PersistentRoundLine = {
  wallet: string;
  status: number;
  finish: number | null;
  zone: number | null;
  riskBand: number | null;
  rewardLamports: string;
  claimed: boolean;
  error: number | null;
  scoreBps: number | null;
};

export type PersistentRoundEntry = {
  id: string;
  room: string;
  presetId: number;
  status: number;
  createdSlot: string;
  resolveSlot: string;
  stakeLamports: string;
  totalStakedLamports: string;
  distributableLamports: string;
  reserveFeeLamports: string;
  playerCount: number;
  committedCount: number;
  revealedCount: number;
  finalHistogram: Forecast;
  winnerWallets: string[];
  lines: PersistentRoundLine[];
};

export type PersistentPlayerRound = {
  id: string;
  room: string;
  presetId: number;
  status: number;
  createdSlot: string;
  resolveSlot: string;
  stakeLamports: string;
  rewardLamports: string;
  finish: number | null;
  error: number | null;
  scoreBps: number | null;
};

export type PersistentPlayerProfile = {
  wallet: string;
  roundsPlayed: number;
  roundsWon: number;
  podiums: number;
  committedRounds: number;
  revealedRounds: number;
  timeoutCount: number;
  totalStakeLamports: string;
  totalPayoutLamports: string;
  cumulativeError: number;
  errorSamples: number;
  averageError: number | null;
  bestScoreBps: number | null;
  lastSeenResolveSlot: string;
  recentRounds: PersistentPlayerRound[];
};

export type PersistentLeaderboardEntry = {
  wallet: string;
  score: number;
  roundsPlayed: number;
  roundsWon: number;
  winRate: number;
  averageError: number | null;
  totalPayoutLamports: string;
  totalStakeLamports: string;
  bestScoreBps: number | null;
  timeoutCount: number;
};

export function buildRoundReplaySlug(input: { room: string; createdSlot: string }) {
  return `${input.room}~${input.createdSlot}`;
}

export function parseRoundReplaySlug(slug: string) {
  const parts = slug.split("~");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  return {
    room: parts[0],
    createdSlot: parts[1]
  };
}

export function sortPersistentRoundLines(round: PersistentRoundEntry) {
  return [...round.lines].sort((left, right) => {
    if (left.finish !== null && right.finish !== null && left.finish !== right.finish) {
      return left.finish - right.finish;
    }
    if (left.finish !== null) {
      return -1;
    }
    if (right.finish !== null) {
      return 1;
    }
    return Number(BigInt(right.rewardLamports) - BigInt(left.rewardLamports));
  });
}

export function summarizeResolvedRound(room: FaultlineRoomAccount): PersistentRoundEntry | null {
  if (room.status !== ROOM_STATUS.Resolved) {
    return null;
  }

  const { scoredPlayers, histogram } = scoreResolvedRoom(room);
  const finishByIndex = new Map(scoredPlayers.map((player, index) => [player.index, index + 1]));

  return {
    id: getPersistentRoundId(room),
    room: room.publicKey.toBase58(),
    presetId: room.presetId,
    status: room.status,
    createdSlot: room.createdSlot.toString(),
    resolveSlot: room.resolveSlot.toString(),
    stakeLamports: room.stakeLamports.toString(),
    totalStakedLamports: room.totalStakedLamports.toString(),
    distributableLamports: room.distributableLamports.toString(),
    reserveFeeLamports: room.reserveFeeLamports.toString(),
    playerCount: room.playerCount,
    committedCount: room.committedCount,
    revealedCount: room.revealedCount,
    finalHistogram: histogram,
    winnerWallets: scoredPlayers.slice(0, room.winnerCount).map((player) => room.playerKeys[player.index].toBase58()),
    lines: Array.from({ length: room.playerCount }, (_, index) => ({
      wallet: room.playerKeys[index].toBase58(),
      status: room.playerStatuses[index],
      finish: finishByIndex.get(index) ?? null,
      zone: room.playerStatuses[index] === PLAYER_STATUS.Revealed ? room.playerZones[index] : null,
      riskBand: room.playerStatuses[index] === PLAYER_STATUS.Revealed ? room.playerRisks[index] : null,
      rewardLamports: room.playerRewardsLamports[index].toString(),
      claimed: room.playerClaimed[index],
      error: room.playerStatuses[index] === PLAYER_STATUS.Revealed ? room.playerErrors[index] : null,
      scoreBps: room.playerStatuses[index] === PLAYER_STATUS.Revealed ? room.playerScoresBps[index] : null
    }))
  };
}

export function createEmptyPersistentPlayerProfile(wallet: string): PersistentPlayerProfile {
  return {
    wallet,
    roundsPlayed: 0,
    roundsWon: 0,
    podiums: 0,
    committedRounds: 0,
    revealedRounds: 0,
    timeoutCount: 0,
    totalStakeLamports: "0",
    totalPayoutLamports: "0",
    cumulativeError: 0,
    errorSamples: 0,
    averageError: null,
    bestScoreBps: null,
    lastSeenResolveSlot: "0",
    recentRounds: []
  };
}

export function applyRoundToPersistentProfile(profile: PersistentPlayerProfile, round: PersistentRoundEntry) {
  const line = round.lines.find((entry) => entry.wallet === profile.wallet);
  if (!line) {
    return profile;
  }

  const nextStake = BigInt(profile.totalStakeLamports) + BigInt(round.stakeLamports);
  const nextPayout = BigInt(profile.totalPayoutLamports) + BigInt(line.rewardLamports);
  const alreadyTracked = profile.recentRounds.some((entry) => entry.id === round.id);
  const recentRounds = alreadyTracked
    ? profile.recentRounds
    : [
        {
          id: round.id,
          room: round.room,
          presetId: round.presetId,
          status: round.status,
          createdSlot: round.createdSlot,
          resolveSlot: round.resolveSlot,
          stakeLamports: round.stakeLamports,
          rewardLamports: line.rewardLamports,
          finish: line.finish,
          error: line.error,
          scoreBps: line.scoreBps
        },
        ...profile.recentRounds
      ].sort((left, right) => Number(BigInt(right.resolveSlot) - BigInt(left.resolveSlot))).slice(0, 12);

  const cumulativeError = profile.cumulativeError + (line.error ?? 0);
  const errorSamples = profile.errorSamples + (line.error === null ? 0 : 1);

  return {
    wallet: profile.wallet,
    roundsPlayed: profile.roundsPlayed + 1,
    roundsWon: profile.roundsWon + (BigInt(line.rewardLamports) > 0n ? 1 : 0),
    podiums: profile.podiums + (line.finish !== null && line.finish <= 3 ? 1 : 0),
    committedRounds: profile.committedRounds + (line.status === PLAYER_STATUS.Committed || line.status === PLAYER_STATUS.Revealed || line.status === PLAYER_STATUS.RevealTimedOut ? 1 : 0),
    revealedRounds: profile.revealedRounds + (line.status === PLAYER_STATUS.Revealed ? 1 : 0),
    timeoutCount: profile.timeoutCount + (line.status === PLAYER_STATUS.CommitTimedOut || line.status === PLAYER_STATUS.RevealTimedOut ? 1 : 0),
    totalStakeLamports: nextStake.toString(),
    totalPayoutLamports: nextPayout.toString(),
    cumulativeError,
    errorSamples,
    averageError: errorSamples > 0 ? cumulativeError / errorSamples : null,
    bestScoreBps: line.scoreBps === null ? profile.bestScoreBps : Math.max(profile.bestScoreBps ?? 0, line.scoreBps),
    lastSeenResolveSlot: BigInt(round.resolveSlot) > BigInt(profile.lastSeenResolveSlot) ? round.resolveSlot : profile.lastSeenResolveSlot,
    recentRounds
  };
}

export function buildPersistentLeaderboard(profiles: PersistentPlayerProfile[]) {
  return profiles
    .filter((profile) => profile.roundsPlayed > 0)
    .map<PersistentLeaderboardEntry>((profile) => {
      const winRate = profile.roundsPlayed > 0 ? profile.roundsWon / profile.roundsPlayed : 0;
      const payoutWeight = Number(BigInt(profile.totalPayoutLamports) / 10_000_000n);
      const score = Math.round(
        profile.roundsWon * 120 +
          profile.podiums * 28 +
          payoutWeight +
          profile.revealedRounds * 6 +
          winRate * 90 -
          profile.timeoutCount * 14 -
          (profile.averageError ?? 0) * 3
      );

      return {
        wallet: profile.wallet,
        score,
        roundsPlayed: profile.roundsPlayed,
        roundsWon: profile.roundsWon,
        winRate,
        averageError: profile.averageError,
        totalPayoutLamports: profile.totalPayoutLamports,
        totalStakeLamports: profile.totalStakeLamports,
        bestScoreBps: profile.bestScoreBps,
        timeoutCount: profile.timeoutCount
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.roundsWon !== left.roundsWon) {
        return right.roundsWon - left.roundsWon;
      }
      return Number(BigInt(right.totalPayoutLamports) - BigInt(left.totalPayoutLamports));
    });
}

export function getPersistentRoundId(room: Pick<FaultlineRoomAccount, "publicKey" | "createdSlot">) {
  return `${room.publicKey.toBase58()}:${room.createdSlot.toString()}`;
}

export function getPersistentRoundIdFromParts(room: string, createdSlot: string) {
  return `${room}:${createdSlot}`;
}
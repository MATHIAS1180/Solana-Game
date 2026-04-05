import { PublicKey } from "@solana/web3.js";

import type { FaultlineReserveAccount, FaultlineRoomAccount, Forecast } from "@/lib/faultline/types";

export type SerializedFaultlineRoomAccount = {
  publicKey: string;
  version: number;
  roomBump: number;
  vaultBump: number;
  status: number;
  zoneCount: number;
  minPlayers: number;
  maxPlayers: number;
  playerCount: number;
  committedCount: number;
  revealedCount: number;
  activeCount: number;
  winnerCount: number;
  presetId: number;
  flags: number;
  stakeLamports: string;
  totalStakedLamports: string;
  distributableLamports: string;
  reserveFeeLamports: string;
  slashedToReserveLamports: string;
  createdSlot: string;
  joinDeadlineSlot: string;
  joinDurationSlots: string;
  commitDurationSlots: string;
  commitDeadlineSlot: string;
  revealDurationSlots: string;
  revealDeadlineSlot: string;
  resolveSlot: string;
  creator: string;
  vault: string;
  reserve: string;
  treasury: string;
  roomSeed: number[];
  finalHistogram: Forecast;
  winnerIndices: number[];
  payoutBps: number[];
  playerKeys: string[];
  playerStatuses: number[];
  playerClaimed: boolean[];
  playerZones: number[];
  playerRisks: number[];
  playerCommitHashes: number[][];
  playerForecasts: Forecast[];
  playerErrors: number[];
  playerScoresBps: number[];
  playerRewardsLamports: string[];
};

export type SerializedFaultlineReserveAccount = {
  publicKey: string;
  version: number;
  bump: number;
  paused: boolean;
  freeAccessEnabled: boolean;
  totalCollectedLamports: string;
  totalDistributedLamports: string;
  antiGriefCollectedLamports: string;
  revealTimeoutCollectedLamports: string;
  freeAccessDistributedLamports: string;
  authority: string;
};

export function serializeRoomAccount(room: FaultlineRoomAccount): SerializedFaultlineRoomAccount {
  return {
    publicKey: room.publicKey.toBase58(),
    version: room.version,
    roomBump: room.roomBump,
    vaultBump: room.vaultBump,
    status: room.status,
    zoneCount: room.zoneCount,
    minPlayers: room.minPlayers,
    maxPlayers: room.maxPlayers,
    playerCount: room.playerCount,
    committedCount: room.committedCount,
    revealedCount: room.revealedCount,
    activeCount: room.activeCount,
    winnerCount: room.winnerCount,
    presetId: room.presetId,
    flags: room.flags,
    stakeLamports: room.stakeLamports.toString(),
    totalStakedLamports: room.totalStakedLamports.toString(),
    distributableLamports: room.distributableLamports.toString(),
    reserveFeeLamports: room.reserveFeeLamports.toString(),
    slashedToReserveLamports: room.slashedToReserveLamports.toString(),
    createdSlot: room.createdSlot.toString(),
    joinDeadlineSlot: room.joinDeadlineSlot.toString(),
    joinDurationSlots: room.joinDurationSlots.toString(),
    commitDurationSlots: room.commitDurationSlots.toString(),
    commitDeadlineSlot: room.commitDeadlineSlot.toString(),
    revealDurationSlots: room.revealDurationSlots.toString(),
    revealDeadlineSlot: room.revealDeadlineSlot.toString(),
    resolveSlot: room.resolveSlot.toString(),
    creator: room.creator.toBase58(),
    vault: room.vault.toBase58(),
    reserve: room.reserve.toBase58(),
    treasury: room.treasury.toBase58(),
    roomSeed: Array.from(room.roomSeed),
    finalHistogram: room.finalHistogram,
    winnerIndices: room.winnerIndices,
    payoutBps: room.payoutBps,
    playerKeys: room.playerKeys.map((key) => key.toBase58()),
    playerStatuses: room.playerStatuses,
    playerClaimed: room.playerClaimed,
    playerZones: room.playerZones,
    playerRisks: room.playerRisks,
    playerCommitHashes: room.playerCommitHashes.map((hash) => Array.from(hash)),
    playerForecasts: room.playerForecasts,
    playerErrors: room.playerErrors,
    playerScoresBps: room.playerScoresBps,
    playerRewardsLamports: room.playerRewardsLamports.map((value) => value.toString())
  };
}

export function deserializeRoomAccount(room: SerializedFaultlineRoomAccount): FaultlineRoomAccount {
  return {
    publicKey: new PublicKey(room.publicKey),
    version: room.version,
    roomBump: room.roomBump,
    vaultBump: room.vaultBump,
    status: room.status as FaultlineRoomAccount["status"],
    zoneCount: room.zoneCount,
    minPlayers: room.minPlayers,
    maxPlayers: room.maxPlayers,
    playerCount: room.playerCount,
    committedCount: room.committedCount,
    revealedCount: room.revealedCount,
    activeCount: room.activeCount,
    winnerCount: room.winnerCount,
    presetId: room.presetId,
    flags: room.flags,
    stakeLamports: BigInt(room.stakeLamports),
    totalStakedLamports: BigInt(room.totalStakedLamports),
    distributableLamports: BigInt(room.distributableLamports),
    reserveFeeLamports: BigInt(room.reserveFeeLamports),
    slashedToReserveLamports: BigInt(room.slashedToReserveLamports),
    createdSlot: BigInt(room.createdSlot),
    joinDeadlineSlot: BigInt(room.joinDeadlineSlot),
    joinDurationSlots: BigInt(room.joinDurationSlots),
    commitDurationSlots: BigInt(room.commitDurationSlots),
    commitDeadlineSlot: BigInt(room.commitDeadlineSlot),
    revealDurationSlots: BigInt(room.revealDurationSlots),
    revealDeadlineSlot: BigInt(room.revealDeadlineSlot),
    resolveSlot: BigInt(room.resolveSlot),
    creator: new PublicKey(room.creator),
    vault: new PublicKey(room.vault),
    reserve: new PublicKey(room.reserve),
    treasury: new PublicKey(room.treasury),
    roomSeed: Uint8Array.from(room.roomSeed),
    finalHistogram: room.finalHistogram,
    winnerIndices: room.winnerIndices,
    payoutBps: room.payoutBps,
    playerKeys: room.playerKeys.map((key) => new PublicKey(key)),
    playerStatuses: room.playerStatuses as FaultlineRoomAccount["playerStatuses"],
    playerClaimed: room.playerClaimed,
    playerZones: room.playerZones as FaultlineRoomAccount["playerZones"],
    playerRisks: room.playerRisks as FaultlineRoomAccount["playerRisks"],
    playerCommitHashes: room.playerCommitHashes.map((hash) => Uint8Array.from(hash)),
    playerForecasts: room.playerForecasts,
    playerErrors: room.playerErrors,
    playerScoresBps: room.playerScoresBps,
    playerRewardsLamports: room.playerRewardsLamports.map((value) => BigInt(value))
  };
}

export function serializeReserveAccount(reserve: FaultlineReserveAccount): SerializedFaultlineReserveAccount {
  return {
    publicKey: reserve.publicKey.toBase58(),
    version: reserve.version,
    bump: reserve.bump,
    paused: reserve.paused,
    freeAccessEnabled: reserve.freeAccessEnabled,
    totalCollectedLamports: reserve.totalCollectedLamports.toString(),
    totalDistributedLamports: reserve.totalDistributedLamports.toString(),
    antiGriefCollectedLamports: reserve.antiGriefCollectedLamports.toString(),
    revealTimeoutCollectedLamports: reserve.revealTimeoutCollectedLamports.toString(),
    freeAccessDistributedLamports: reserve.freeAccessDistributedLamports.toString(),
    authority: reserve.authority.toBase58()
  };
}
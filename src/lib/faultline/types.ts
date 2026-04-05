import type { PublicKey } from "@solana/web3.js";

import type { PLAYER_STATUS, ROOM_STATUS, RISK_BAND } from "@/lib/faultline/constants";

export type Zone = 0 | 1 | 2 | 3 | 4;
export type RiskBand = (typeof RISK_BAND)[keyof typeof RISK_BAND];
export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];
export type PlayerStatus = (typeof PLAYER_STATUS)[keyof typeof PLAYER_STATUS];

export type Forecast = [number, number, number, number, number];

export type CommitPayload = {
  room: PublicKey;
  player: PublicKey;
  zone: Zone;
  riskBand: RiskBand;
  forecast: Forecast;
  nonce: Uint8Array;
};

export type StoredCommitPayload = {
  room: string;
  player: string;
  zone: Zone;
  riskBand: RiskBand;
  forecast: Forecast;
  nonce: number[];
  commitHash: number[];
  createdAt: number;
};

export type FaultlineRoomAccount = {
  publicKey: PublicKey;
  version: number;
  roomBump: number;
  vaultBump: number;
  status: RoomStatus;
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
  stakeLamports: bigint;
  totalStakedLamports: bigint;
  distributableLamports: bigint;
  reserveFeeLamports: bigint;
  slashedToReserveLamports: bigint;
  createdSlot: bigint;
  joinDeadlineSlot: bigint;
  joinDurationSlots: bigint;
  commitDurationSlots: bigint;
  commitDeadlineSlot: bigint;
  revealDurationSlots: bigint;
  revealDeadlineSlot: bigint;
  resolveSlot: bigint;
  creator: PublicKey;
  vault: PublicKey;
  reserve: PublicKey;
  treasury: PublicKey;
  roomSeed: Uint8Array;
  finalHistogram: Forecast;
  winnerIndices: number[];
  payoutBps: number[];
  playerKeys: PublicKey[];
  playerStatuses: PlayerStatus[];
  playerClaimed: boolean[];
  playerZones: number[];
  playerRisks: number[];
  playerCommitHashes: Uint8Array[];
  playerForecasts: Forecast[];
  playerErrors: number[];
  playerScoresBps: number[];
  playerRewardsLamports: bigint[];
};

export type ScoredPlayer = {
  index: number;
  zone: Zone;
  riskBand: RiskBand;
  forecast: Forecast;
  error: number;
  scoreBps: number;
  zoneOccupancy: number;
  payoutBps: number;
};

export type RoomPreset = {
  id: number;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  stakeLamports: number;
  joinWindowSlots: number;
  commitWindowSlots: number;
  revealWindowSlots: number;
};
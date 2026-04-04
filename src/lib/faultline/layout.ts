import { PublicKey } from "@solana/web3.js";

import { MAX_PLAYERS, ROOM_STATE_SIZE, ZONE_COUNT } from "@/lib/faultline/constants";
import type { FaultlineRoomAccount, Forecast, PlayerStatus, RiskBand, RoomStatus, Zone } from "@/lib/faultline/types";

class ByteReader {
  private offset = 0;

  constructor(private readonly input: Uint8Array) {}

  readU8() {
    const value = this.input[this.offset];
    this.offset += 1;
    return value;
  }

  readU16() {
    const value = new DataView(this.input.buffer, this.input.byteOffset + this.offset, 2).getUint16(0, true);
    this.offset += 2;
    return value;
  }

  readU32() {
    const value = new DataView(this.input.buffer, this.input.byteOffset + this.offset, 4).getUint32(0, true);
    this.offset += 4;
    return value;
  }

  readU64() {
    const value = new DataView(this.input.buffer, this.input.byteOffset + this.offset, 8).getBigUint64(0, true);
    this.offset += 8;
    return value;
  }

  readBytes(length: number) {
    const value = this.input.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
}

function readPubkey(reader: ByteReader) {
  return new PublicKey(reader.readBytes(32));
}

function readForecast(reader: ByteReader): Forecast {
  const bytes = reader.readBytes(ZONE_COUNT);
  return [bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]];
}

export function decodeRoomAccount(publicKey: PublicKey, data: Buffer | Uint8Array): FaultlineRoomAccount {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length !== ROOM_STATE_SIZE) {
    throw new Error(`Taille de room inattendue: ${bytes.length}`);
  }

  const reader = new ByteReader(bytes);
  const version = reader.readU8();
  const roomBump = reader.readU8();
  const vaultBump = reader.readU8();
  const status = reader.readU8();
  const zoneCount = reader.readU8();
  const minPlayers = reader.readU8();
  const maxPlayers = reader.readU8();
  const playerCount = reader.readU8();
  const committedCount = reader.readU8();
  const revealedCount = reader.readU8();
  const activeCount = reader.readU8();
  const winnerCount = reader.readU8();
  const presetId = reader.readU8();
  const flags = reader.readU8();
  const stakeLamports = reader.readU64();
  const totalStakedLamports = reader.readU64();
  const distributableLamports = reader.readU64();
  const reserveFeeLamports = reader.readU64();
  const slashedToReserveLamports = reader.readU64();
  const createdSlot = reader.readU64();
  const joinDeadlineSlot = reader.readU64();
  const commitDurationSlots = reader.readU64();
  const commitDeadlineSlot = reader.readU64();
  const revealDurationSlots = reader.readU64();
  const revealDeadlineSlot = reader.readU64();
  const resolveSlot = reader.readU64();
  const creator = readPubkey(reader);
  const vault = readPubkey(reader);
  const reserve = readPubkey(reader);
  const treasury = readPubkey(reader);
  const roomSeed = reader.readBytes(32);
  const finalHistogram = readForecast(reader);
  const winnerIndices = Array.from(reader.readBytes(4));
  const payoutBps = [reader.readU16(), reader.readU16(), reader.readU16(), reader.readU16()];

  const playerKeys = Array.from({ length: MAX_PLAYERS }, () => readPubkey(reader));
  const playerStatuses = Array.from({ length: MAX_PLAYERS }, () => reader.readU8());
  const playerClaimed = Array.from({ length: MAX_PLAYERS }, () => reader.readU8() === 1);
  const playerZones = Array.from({ length: MAX_PLAYERS }, () => reader.readU8());
  const playerRisks = Array.from({ length: MAX_PLAYERS }, () => reader.readU8());
  const playerCommitHashes = Array.from({ length: MAX_PLAYERS }, () => reader.readBytes(32));
  const playerForecasts = Array.from({ length: MAX_PLAYERS }, () => readForecast(reader));
  const playerErrors = Array.from({ length: MAX_PLAYERS }, () => reader.readU16());
  const playerScoresBps = Array.from({ length: MAX_PLAYERS }, () => reader.readU32());
  const playerRewardsLamports = Array.from({ length: MAX_PLAYERS }, () => reader.readU64());

  return {
    publicKey,
    version,
    roomBump,
    vaultBump,
    status: status as RoomStatus,
    zoneCount,
    minPlayers,
    maxPlayers,
    playerCount,
    committedCount,
    revealedCount,
    activeCount,
    winnerCount,
    presetId,
    flags,
    stakeLamports,
    totalStakedLamports,
    distributableLamports,
    reserveFeeLamports,
    slashedToReserveLamports,
    createdSlot,
    joinDeadlineSlot,
    commitDurationSlots,
    commitDeadlineSlot,
    revealDurationSlots,
    revealDeadlineSlot,
    resolveSlot,
    creator,
    vault,
    reserve,
    treasury,
    roomSeed,
    finalHistogram,
    winnerIndices,
    payoutBps,
    playerKeys,
    playerStatuses: playerStatuses as PlayerStatus[],
    playerClaimed,
    playerZones: playerZones as Zone[],
    playerRisks: playerRisks as RiskBand[],
    playerCommitHashes,
    playerForecasts,
    playerErrors,
    playerScoresBps,
    playerRewardsLamports
  };
}
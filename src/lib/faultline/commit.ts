import { sha256 } from "@noble/hashes/sha2";

import {
  FAULTLINE_COMMIT_DOMAIN,
  FAULTLINE_COMMIT_DOMAIN_V1,
  FAULTLINE_LEGACY_COMMIT_VERSION,
  FAULTLINE_COMMIT_VERSION,
  MAX_PLAYERS,
  ZONE_COUNT
} from "@/lib/faultline/constants";
import type { CommitPayload, Forecast, StoredCommitPayload } from "@/lib/faultline/types";

const encoder = new TextEncoder();
const commitDomainBytes = encoder.encode(FAULTLINE_COMMIT_DOMAIN);
const legacyCommitDomainBytes = encoder.encode(FAULTLINE_COMMIT_DOMAIN_V1);

export function validateForecast(forecast: Forecast, minPlayers: number, maxPlayers: number) {
  const total = forecast.reduce((sum, value) => sum + value, 0);
  const allValuesAreValid = forecast.every((value) => Number.isInteger(value) && value >= 0 && value <= MAX_PLAYERS);

  return {
    valid: forecast.length === ZONE_COUNT && allValuesAreValid && total >= minPlayers && total <= maxPlayers,
    total
  };
}

export function serializeCommitPayload(payload: CommitPayload) {
  if (payload.nonce.length !== 32) {
    throw new Error("Le nonce doit faire 32 bytes.");
  }

  if (payload.roundId < 0n) {
    throw new Error("Le roundId doit etre positif.");
  }

  const roundIdBytes = toU64LE(payload.roundId);

  const output = new Uint8Array(commitDomainBytes.length + 32 + 32 + 8 + 1 + 1 + 5 + 32);
  let offset = 0;

  output.set(commitDomainBytes, offset);
  offset += commitDomainBytes.length;
  output.set(payload.room.toBytes(), offset);
  offset += 32;
  output.set(payload.player.toBytes(), offset);
  offset += 32;
  output.set(roundIdBytes, offset);
  offset += 8;

  output[offset++] = payload.zone;
  output[offset++] = payload.riskBand;
  output.set(payload.forecast, offset);
  offset += 5;
  output.set(payload.nonce, offset);

  return output;
}

export function serializeLegacyCommitPayload(payload: Omit<CommitPayload, "roundId"> | CommitPayload) {
  if (payload.nonce.length !== 32) {
    throw new Error("Le nonce doit faire 32 bytes.");
  }

  const output = new Uint8Array(legacyCommitDomainBytes.length + 32 + 32 + 1 + 1 + 5 + 32);
  let offset = 0;

  output.set(legacyCommitDomainBytes, offset);
  offset += legacyCommitDomainBytes.length;
  output.set(payload.room.toBytes(), offset);
  offset += 32;
  output.set(payload.player.toBytes(), offset);
  offset += 32;

  output[offset++] = payload.zone;
  output[offset++] = payload.riskBand;
  output.set(payload.forecast, offset);
  offset += 5;
  output.set(payload.nonce, offset);

  return output;
}

export function buildCommitHash(payload: CommitPayload, version = FAULTLINE_COMMIT_VERSION) {
  if (version === FAULTLINE_LEGACY_COMMIT_VERSION) {
    return Uint8Array.from(sha256(serializeLegacyCommitPayload(payload)));
  }

  return Uint8Array.from(sha256(serializeCommitPayload(payload)));
}

export function buildCommitHashHex(payload: CommitPayload, version = FAULTLINE_COMMIT_VERSION) {
  return toHex(buildCommitHash(payload, version));
}

export function parseStoredCommitPayload(value: unknown, fallbackRoundId = 0n): StoredCommitPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid JSON payload.");
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.room !== "string" || typeof candidate.player !== "string") {
    throw new Error("room and player are required.");
  }
  if (typeof candidate.zone !== "number" || typeof candidate.riskBand !== "number") {
    throw new Error("zone and riskBand are required.");
  }
  if (!Array.isArray(candidate.forecast) || candidate.forecast.length !== 5) {
    throw new Error("forecast must contain exactly 5 values.");
  }
  if (!Array.isArray(candidate.nonce) || candidate.nonce.length !== 32) {
    throw new Error("nonce must contain exactly 32 values.");
  }
  if (!Array.isArray(candidate.commitHash) || candidate.commitHash.length !== 32) {
    throw new Error("commitHash must contain exactly 32 values.");
  }

  return {
    room: candidate.room,
    player: candidate.player,
    roundId: normalizeRoundId(candidate.roundId, fallbackRoundId),
    commitVersion: typeof candidate.commitVersion === "number" ? candidate.commitVersion : FAULTLINE_LEGACY_COMMIT_VERSION,
    zone: candidate.zone as StoredCommitPayload["zone"],
    riskBand: candidate.riskBand as StoredCommitPayload["riskBand"],
    forecast: candidate.forecast.map((item) => Number(item)) as StoredCommitPayload["forecast"],
    nonce: candidate.nonce.map((item) => Number(item)),
    commitHash: candidate.commitHash.map((item) => Number(item)),
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now()
  };
}

export function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(value: string) {
  const output = new Uint8Array(value.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

export function isZeroNonce(nonce: Uint8Array) {
  return nonce.every((value) => value === 0);
}

export function generateNonce() {
  const output = new Uint8Array(32);
  crypto.getRandomValues(output);
  return output;
}

function toU64LE(value: bigint) {
  const output = new Uint8Array(8);
  new DataView(output.buffer).setBigUint64(0, value, true);
  return output;
}

function normalizeRoundId(value: unknown, fallbackRoundId: bigint) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(value).toString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return fallbackRoundId.toString();
}
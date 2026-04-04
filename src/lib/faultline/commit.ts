import { sha256 } from "@noble/hashes/sha2";

import { FAULTLINE_COMMIT_DOMAIN, MAX_PLAYERS, ZONE_COUNT } from "@/lib/faultline/constants";
import type { CommitPayload, Forecast } from "@/lib/faultline/types";

const encoder = new TextEncoder();
const commitDomainBytes = encoder.encode(FAULTLINE_COMMIT_DOMAIN);

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

  const output = new Uint8Array(commitDomainBytes.length + 32 + 32 + 1 + 1 + 5 + 32);
  let offset = 0;

  output.set(commitDomainBytes, offset);
  offset += commitDomainBytes.length;
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

export function buildCommitHash(payload: CommitPayload) {
  return Uint8Array.from(sha256(serializeCommitPayload(payload)));
}

export function buildCommitHashHex(payload: CommitPayload) {
  return toHex(buildCommitHash(payload));
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
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { buildCommitHashHex, parseStoredCommitPayload, validateForecast } from "@/lib/faultline/commit";
import { FAULTLINE_LEGACY_COMMIT_VERSION } from "@/lib/faultline/constants";
import type { CommitPayload } from "@/lib/faultline/types";

describe("faultline commit", () => {
  it("produit un hash canonique stable pour un vecteur de reference", () => {
    const payload: CommitPayload = {
      room: new PublicKey(new Uint8Array(32).fill(1)),
      player: new PublicKey(new Uint8Array(32).fill(2)),
      roundId: 42n,
      zone: 2,
      riskBand: 1,
      forecast: [3, 4, 5, 2, 6],
      nonce: new Uint8Array(32).fill(7)
    };

    expect(buildCommitHashHex(payload)).toBe("3b165abab0675d4ab23f8afefa9b99b80a42d93ddcaf6f1223f63a4243a95843");
  });

  it("garde le hash legacy v1 pour les payloads normalises anciens", () => {
    const payload: CommitPayload = {
      room: new PublicKey(new Uint8Array(32).fill(1)),
      player: new PublicKey(new Uint8Array(32).fill(2)),
      roundId: 42n,
      zone: 2,
      riskBand: 1,
      forecast: [3, 4, 5, 2, 6],
      nonce: new Uint8Array(32).fill(7)
    };

    expect(buildCommitHashHex(payload, FAULTLINE_LEGACY_COMMIT_VERSION)).toBe("bd1886919d6c3deac44f764299e01629363b1264d0f64343b008a3bfb8552a18");
  });

  it("rejette les forecasts hors bornes de joueurs", () => {
    expect(validateForecast([1, 1, 1, 1, 1], 2, 8)).toEqual({ valid: true, total: 5 });
    expect(validateForecast([0, 0, 0, 0, 1], 2, 8)).toEqual({ valid: false, total: 1 });
    expect(validateForecast([9, 0, 0, 0, 0], 2, 8)).toEqual({ valid: false, total: 9 });
  });

  it("normalise un backup legacy sans roundId ni version", () => {
    expect(
      parseStoredCommitPayload({
        room: new PublicKey(new Uint8Array(32).fill(1)).toBase58(),
        player: new PublicKey(new Uint8Array(32).fill(2)).toBase58(),
        zone: 2,
        riskBand: 1,
        forecast: [3, 4, 5, 2, 6],
        nonce: new Array(32).fill(7),
        commitHash: new Array(32).fill(8),
        createdAt: 123
      }, 99n)
    ).toMatchObject({ roundId: "99", commitVersion: 1, createdAt: 123 });
  });
});
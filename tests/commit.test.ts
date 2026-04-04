import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { buildCommitHashHex, validateForecast } from "@/lib/faultline/commit";
import type { CommitPayload } from "@/lib/faultline/types";

describe("faultline commit", () => {
  it("produit un hash canonique stable pour un vecteur de reference", () => {
    const payload: CommitPayload = {
      room: new PublicKey(new Uint8Array(32).fill(1)),
      player: new PublicKey(new Uint8Array(32).fill(2)),
      zone: 2,
      riskBand: 1,
      forecast: [3, 4, 5, 2, 6],
      nonce: new Uint8Array(32).fill(7)
    };

    expect(buildCommitHashHex(payload)).toBe("bd1886919d6c3deac44f764299e01629363b1264d0f64343b008a3bfb8552a18");
  });

  it("rejette les forecasts hors bornes de joueurs", () => {
    expect(validateForecast([1, 1, 1, 1, 1], 2, 8)).toEqual({ valid: true, total: 5 });
    expect(validateForecast([0, 0, 0, 0, 1], 2, 8)).toEqual({ valid: false, total: 1 });
    expect(validateForecast([9, 0, 0, 0, 0], 2, 8)).toEqual({ valid: false, total: 9 });
  });
});
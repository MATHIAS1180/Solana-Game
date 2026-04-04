import { describe, expect, it } from "vitest";

import { RISK_BAND } from "@/lib/faultline/constants";
import { assignPayouts, describeNearMiss, sortScoredPlayers } from "@/lib/faultline/logic";
import type { ScoredPlayer } from "@/lib/faultline/types";

describe("faultline logic", () => {
  it("departage les ex aequo par cle publique lexicographiquement plus petite", () => {
    const players: ScoredPlayer[] = [
      {
        index: 0,
        zone: 1,
        riskBand: RISK_BAND.Edge,
        forecast: [1, 1, 1, 1, 1],
        error: 3,
        scoreBps: 77500,
        zoneOccupancy: 2,
        payoutBps: 0
      },
      {
        index: 1,
        zone: 1,
        riskBand: RISK_BAND.Edge,
        forecast: [1, 1, 1, 1, 1],
        error: 3,
        scoreBps: 77500,
        zoneOccupancy: 2,
        payoutBps: 0
      }
    ];

    const sorted = sortScoredPlayers(players, (player) => Uint8Array.from(Array(32).fill(player.index === 0 ? 9 : 3)));

    expect(sorted.map((player) => player.index)).toEqual([1, 0]);
  });

  it("attribue le reliquat d'arrondi au premier rang", () => {
    const { ladder, rewards } = assignPayouts(101n, 6);

    expect(ladder).toEqual([7200, 1800, 800, 0]);
    expect(rewards).toEqual([75n, 18n, 8n, 0n]);
    expect(rewards.reduce((sum, value) => sum + value, 0n)).toBe(101n);
  });

  it("explique correctement un miss Knife", () => {
    expect(describeNearMiss(RISK_BAND.Knife, 2, [3, 1, 4, 2, 1])).toContain("minimum reel etait 1");
  });
});
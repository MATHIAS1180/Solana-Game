import {
  MAX_WINNERS,
  PLAYER_STATUS,
  RESERVE_FEE_BPS,
  RISK_BAND,
  RISK_FAIL_MULTIPLIERS_BPS,
  RISK_MULTIPLIERS_BPS
} from "@/lib/faultline/constants";
import type { FaultlineRoomAccount, Forecast, RiskBand, ScoredPlayer, Zone } from "@/lib/faultline/types";

function compareLexicographicBytes(left: Uint8Array, right: Uint8Array) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return left.length - right.length;
}

export function computeHistogram(zones: Zone[]) {
  const histogram: Forecast = [0, 0, 0, 0, 0];
  for (const zone of zones) {
    histogram[zone] += 1;
  }
  return histogram;
}

export function getRiskMultiplier(riskBand: RiskBand, zone: Zone, histogram: Forecast) {
  if (riskBand === RISK_BAND.Calm) {
    return RISK_MULTIPLIERS_BPS[0];
  }

  const sorted = [...histogram].sort((left, right) => left - right);
  const zoneOccupancy = histogram[zone];

  if (riskBand === RISK_BAND.Edge) {
    return zoneOccupancy <= sorted[1] ? RISK_MULTIPLIERS_BPS[1] : RISK_FAIL_MULTIPLIERS_BPS[1];
  }

  return zoneOccupancy === sorted[0] ? RISK_MULTIPLIERS_BPS[2] : RISK_FAIL_MULTIPLIERS_BPS[2];
}

export function computeError(forecast: Forecast, histogram: Forecast) {
  return forecast.reduce((sum, value, index) => sum + Math.abs(value - histogram[index]), 0);
}

export function computeBaseScore(playerCount: number, error: number) {
  return Math.max(1, 5 * playerCount - error);
}

export function getPayoutLadder(playerCount: number) {
  if (playerCount <= 4) {
    return [9000, 800, 0, 0];
  }
  if (playerCount <= 24) {
    return [7200, 1800, 800, 0];
  }
  return [6400, 2000, 1000, 400];
}

export function sortScoredPlayers(players: ScoredPlayer[], getTieBreakKey?: (player: ScoredPlayer) => Uint8Array) {
  return [...players].sort((left, right) => {
    if (left.scoreBps !== right.scoreBps) {
      return right.scoreBps - left.scoreBps;
    }
    if (left.error !== right.error) {
      return left.error - right.error;
    }
    if (left.zoneOccupancy !== right.zoneOccupancy) {
      return left.zoneOccupancy - right.zoneOccupancy;
    }
    if (left.riskBand !== right.riskBand) {
      return right.riskBand - left.riskBand;
    }
    if (getTieBreakKey) {
      return compareLexicographicBytes(getTieBreakKey(left), getTieBreakKey(right));
    }
    return left.index - right.index;
  });
}

export function scoreResolvedRoom(room: FaultlineRoomAccount) {
  const revealedPlayers = room.playerKeys
    .map((key, index) => ({ key, index }))
    .filter(({ index }) => room.playerStatuses[index] === PLAYER_STATUS.Revealed);

  const histogram = room.finalHistogram.some((value) => value > 0)
    ? room.finalHistogram
    : computeHistogram(revealedPlayers.map(({ index }) => room.playerZones[index] as Zone));

  const scoredPlayers = revealedPlayers.map(({ index }) => {
    const error = room.playerErrors[index] || computeError(room.playerForecasts[index], histogram);
    const scoreBps = room.playerScoresBps[index] || computeBaseScore(revealedPlayers.length, error) * getRiskMultiplier(room.playerRisks[index] as RiskBand, room.playerZones[index] as Zone, histogram);
    return {
      index,
      zone: room.playerZones[index] as Zone,
      riskBand: room.playerRisks[index] as RiskBand,
      forecast: room.playerForecasts[index],
      error,
      scoreBps,
      zoneOccupancy: histogram[room.playerZones[index]],
      payoutBps: 0
    };
  });

  const rankedPlayers = sortScoredPlayers(scoredPlayers, (player) => room.playerKeys[player.index].toBytes());
  rankedPlayers.forEach((player, rank) => {
    player.payoutBps = room.payoutBps[rank] || 0;
  });

  return {
    histogram,
    scoredPlayers: rankedPlayers
  };
}

export function computeDistributablePot(totalStakedLamports: bigint, slashedToReserveLamports: bigint) {
  const reserveFeeLamports = (totalStakedLamports * BigInt(RESERVE_FEE_BPS)) / 10_000n;
  return totalStakedLamports - reserveFeeLamports - slashedToReserveLamports;
}

export function assignPayouts(totalDistributableLamports: bigint, playerCount: number) {
  const ladder = getPayoutLadder(playerCount);
  const rewards = Array.from({ length: MAX_WINNERS }, () => 0n);

  let remainder = totalDistributableLamports;
  ladder.forEach((bps, index) => {
    if (bps === 0) {
      return;
    }
    rewards[index] = (totalDistributableLamports * BigInt(bps)) / 10_000n;
    remainder -= rewards[index];
  });

  rewards[0] += remainder;

  return { ladder, rewards };
}

export function describeNearMiss(riskBand: RiskBand, zone: Zone, histogram: Forecast) {
  if (riskBand === RISK_BAND.Calm) {
    return "Calm ne depend d’aucune condition de congestion.";
  }

  const zoneOccupancy = histogram[zone];
  const sorted = [...histogram].sort((left, right) => left - right);

  if (riskBand === RISK_BAND.Edge) {
    const threshold = sorted[1];
    return zoneOccupancy <= threshold
      ? "Edge a touche: ta zone termine dans les deux zones les moins peuplees."
      : `Edge manque: ta zone finit avec ${zoneOccupancy} joueurs, au-dessus du seuil ${threshold}.`;
  }

  const minimum = sorted[0];
  return zoneOccupancy === minimum
    ? "Knife a touche: ta zone partage le minimum absolu d’occupation."
    : `Knife manque: ta zone finit a ${zoneOccupancy} joueurs, le minimum reel etait ${minimum}.`;
}
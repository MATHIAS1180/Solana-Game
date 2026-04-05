import "server-only";

import { Redis } from "@upstash/redis";

import { applyRoundToPersistentProfile, buildPersistentLeaderboard, createEmptyPersistentPlayerProfile, summarizeResolvedRound, type PersistentPlayerProfile, type PersistentRoundEntry } from "@/lib/faultline/metagame";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";

let redisClient: Redis | null | undefined;

const memoryRounds = new Map<string, PersistentRoundEntry>();
const memoryProfiles = new Map<string, PersistentPlayerProfile>();
const memoryPlayerIndex = new Set<string>();
const memoryRoundIndex = new Set<string>();

function getRedis() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getRoundKey(id: string) {
  return `faultline:metagame:round:${id}`;
}

function getPlayerKey(wallet: string) {
  return `faultline:metagame:player:${wallet}`;
}

function getRoundIndexKey() {
  return "faultline:metagame:index:rounds";
}

function getPlayerIndexKey() {
  return "faultline:metagame:index:players";
}

async function getJson<T>(key: string, fallback: T) {
  const redis = getRedis();
  if (!redis) {
    return fallback;
  }

  return (await redis.get<T>(key)) ?? fallback;
}

async function setJson<T>(key: string, value: T) {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  await redis.set(key, value);
  return true;
}

async function listRoundIds() {
  return getJson<string[]>(getRoundIndexKey(), []);
}

async function listPlayerWallets() {
  return getJson<string[]>(getPlayerIndexKey(), []);
}

async function updateIndex(key: string, value: string) {
  const redis = getRedis();
  if (!redis) {
    if (key === getRoundIndexKey()) {
      memoryRoundIndex.add(value);
    } else {
      memoryPlayerIndex.add(value);
    }
    return;
  }

  const current = new Set(await getJson<string[]>(key, []));
  current.add(value);
  await redis.set(key, [...current]);
}

async function loadRound(id: string) {
  const redis = getRedis();
  if (!redis) {
    return memoryRounds.get(id) ?? null;
  }

  return (await redis.get<PersistentRoundEntry>(getRoundKey(id))) ?? null;
}

async function storeRound(round: PersistentRoundEntry) {
  const redis = getRedis();
  if (!redis) {
    memoryRounds.set(round.id, round);
    memoryRoundIndex.add(round.id);
    return;
  }

  await redis.set(getRoundKey(round.id), round);
  await updateIndex(getRoundIndexKey(), round.id);
}

async function loadProfile(wallet: string) {
  const redis = getRedis();
  if (!redis) {
    return memoryProfiles.get(wallet) ?? null;
  }

  return (await redis.get<PersistentPlayerProfile>(getPlayerKey(wallet))) ?? null;
}

async function storeProfile(profile: PersistentPlayerProfile) {
  const redis = getRedis();
  if (!redis) {
    memoryProfiles.set(profile.wallet, profile);
    memoryPlayerIndex.add(profile.wallet);
    return;
  }

  await redis.set(getPlayerKey(profile.wallet), profile);
  await updateIndex(getPlayerIndexKey(), profile.wallet);
}

export function isMetagameStorageConfigured() {
  return Boolean(getRedis());
}

export async function syncMetagameFromRooms(rooms: FaultlineRoomAccount[]) {
  for (const room of rooms) {
    const round = summarizeResolvedRound(room);
    if (!round) {
      continue;
    }

    if (await loadRound(round.id)) {
      continue;
    }

    await storeRound(round);

    for (const line of round.lines) {
      const currentProfile = (await loadProfile(line.wallet)) ?? createEmptyPersistentPlayerProfile(line.wallet);
      const nextProfile = applyRoundToPersistentProfile(currentProfile, round);
      await storeProfile(nextProfile);
    }
  }
}

export async function getPersistentPlayerProfile(wallet: string) {
  return (await loadProfile(wallet)) ?? createEmptyPersistentPlayerProfile(wallet);
}

export async function getPersistentRound(id: string) {
  return await loadRound(id);
}

export async function getRecentPersistentRounds(limit = 10) {
  const ids = getRedis() ? await listRoundIds() : [...memoryRoundIndex];
  const rounds = (await Promise.all(ids.map((id) => loadRound(id)))).filter((round): round is PersistentRoundEntry => Boolean(round));
  return rounds.sort((left, right) => Number(BigInt(right.resolveSlot) - BigInt(left.resolveSlot))).slice(0, limit);
}

export async function getPersistentLeaderboard(limit = 20) {
  const wallets = getRedis() ? await listPlayerWallets() : [...memoryPlayerIndex];
  const profiles = (await Promise.all(wallets.map((wallet) => loadProfile(wallet)))).filter((profile): profile is PersistentPlayerProfile => Boolean(profile));
  return buildPersistentLeaderboard(profiles).slice(0, limit);
}
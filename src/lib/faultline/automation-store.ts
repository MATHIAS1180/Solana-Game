import "server-only";

import { Redis } from "@upstash/redis";

import type { StoredCommitPayload } from "@/lib/faultline/types";

let redisClient: Redis | null | undefined;

function getRedis() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getCommitKey(room: string, player: string) {
  return `faultline:commit:${player}:${room}`;
}

export function isAutomationStorageConfigured() {
  return Boolean(getRedis());
}

export async function storeAutomationCommitPayload(record: StoredCommitPayload) {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  await redis.set(getCommitKey(record.room, record.player), record, { ex: 60 * 60 * 24 * 7 });
  return true;
}

export async function getAutomationCommitPayload(room: string, player: string) {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  return (await redis.get<StoredCommitPayload>(getCommitKey(room, player))) ?? null;
}

export async function deleteAutomationCommitPayload(room: string, player: string) {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  await redis.del(getCommitKey(room, player));
  return true;
}
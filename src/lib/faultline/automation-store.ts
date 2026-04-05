import "server-only";

import { Redis } from "@upstash/redis";

import { parseStoredCommitPayload } from "@/lib/faultline/commit";
import type { StoredCommitPayload } from "@/lib/faultline/types";

let redisClient: Redis | null | undefined;
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();

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

function getCommitKey(room: string, player: string) {
  return `faultline:commit:${player}:${room}`;
}

function getHeartbeatKey() {
  return "faultline:heartbeat:lock";
}

function setMemoryValue(key: string, value: string, ttlSeconds?: number) {
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
  });
}

function getMemoryValue(key: string) {
  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  return entry.value;
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

  const payload = (await redis.get<StoredCommitPayload>(getCommitKey(room, player))) ?? null;
  return payload ? parseStoredCommitPayload(payload) : null;
}

export async function deleteAutomationCommitPayload(room: string, player: string) {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  await redis.del(getCommitKey(room, player));
  return true;
}

export async function claimAutomationHeartbeatLock(ttlMs: number) {
  const redis = getRedis();
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  const now = Date.now().toString();

  if (redis) {
    const result = await redis.set(getHeartbeatKey(), now, {
      nx: true,
      ex: ttlSeconds
    });

    return result === "OK";
  }

  if (getMemoryValue(getHeartbeatKey())) {
    return false;
  }

  setMemoryValue(getHeartbeatKey(), now, ttlSeconds);
  return true;
}
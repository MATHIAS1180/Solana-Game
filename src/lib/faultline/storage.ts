import { openDB } from "idb";

import type { StoredCommitPayload } from "@/lib/faultline/types";

const DB_NAME = "faultline-devnet";
const STORE_NAME = "commit-payloads";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      const store = database.createObjectStore(STORE_NAME, {
        keyPath: "id"
      });
      store.createIndex("wallet", "player");
      store.createIndex("room", "room");
    }
  });
}

function getRecordId(room: string, player: string) {
  return `${player}:${room}`;
}

export async function persistCommitPayload(record: StoredCommitPayload) {
  const database = await getDb();
  await database.put(STORE_NAME, {
    id: getRecordId(record.room, record.player),
    ...record
  });
}

export async function getStoredCommitPayload(room: string, player: string) {
  const database = await getDb();
  return (await database.get(STORE_NAME, getRecordId(room, player))) as (StoredCommitPayload & { id: string }) | undefined;
}

export async function listStoredPayloadsForWallet(player: string) {
  const database = await getDb();
  return (await database.getAllFromIndex(STORE_NAME, "wallet", player)) as Array<StoredCommitPayload & { id: string }>;
}

export async function deleteStoredCommitPayload(room: string, player: string) {
  const database = await getDb();
  await database.delete(STORE_NAME, getRecordId(room, player));
}
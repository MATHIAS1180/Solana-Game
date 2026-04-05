import { Connection, PublicKey } from "@solana/web3.js";

import { ROOM_STATE_SIZE } from "@/lib/faultline/constants";
import { decodeRoomAccount } from "@/lib/faultline/layout";

export async function fetchRooms(connection: Connection, programId: PublicKey) {
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: [{ dataSize: ROOM_STATE_SIZE }]
  });

  return accounts.map((account: (typeof accounts)[number]) => decodeRoomAccount(account.pubkey, account.account.data));
}

export async function fetchRoom(connection: Connection, room: PublicKey) {
  const account = await connection.getAccountInfo(room, "confirmed");
  if (!account) {
    return null;
  }

  return decodeRoomAccount(room, account.data);
}

export function findPlayerIndex(room: { playerKeys: PublicKey[]; playerCount: number }, player: PublicKey) {
  for (let index = 0; index < room.playerCount; index += 1) {
    if (room.playerKeys[index].equals(player)) {
      return index;
    }
  }

  return -1;
}
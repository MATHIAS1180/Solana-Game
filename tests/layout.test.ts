import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { MAX_PLAYERS, PLAYER_STATUS, ROOM_STATE_SIZE, ROOM_STATUS } from "@/lib/faultline/constants";
import { decodeRoomAccount } from "@/lib/faultline/layout";

class ByteWriter {
  private offset = 0;

  constructor(private readonly buffer: Uint8Array) {}

  writeU8(value: number) {
    this.buffer[this.offset] = value;
    this.offset += 1;
  }

  writeU16(value: number) {
    new DataView(this.buffer.buffer).setUint16(this.offset, value, true);
    this.offset += 2;
  }

  writeU32(value: number) {
    new DataView(this.buffer.buffer).setUint32(this.offset, value, true);
    this.offset += 4;
  }

  writeU64(value: bigint) {
    new DataView(this.buffer.buffer).setBigUint64(this.offset, value, true);
    this.offset += 8;
  }

  writeBytes(value: Uint8Array) {
    this.buffer.set(value, this.offset);
    this.offset += value.length;
  }

  getOffset() {
    return this.offset;
  }
}

describe("faultline layout", () => {
  it("decode correctement un compte room binaire", () => {
    const bytes = new Uint8Array(ROOM_STATE_SIZE);
    const writer = new ByteWriter(bytes);
    const roomKey = new PublicKey(new Uint8Array(32).fill(8));
    const creator = new Uint8Array(32).fill(11);
    const vault = new Uint8Array(32).fill(12);
    const reserve = new Uint8Array(32).fill(13);
    const treasury = new Uint8Array(32).fill(14);
    const playerOne = new Uint8Array(32).fill(21);
    const playerTwo = new Uint8Array(32).fill(22);

    writer.writeU8(1);
    writer.writeU8(9);
    writer.writeU8(10);
    writer.writeU8(ROOM_STATUS.Reveal);
    writer.writeU8(5);
    writer.writeU8(5);
    writer.writeU8(12);
    writer.writeU8(2);
    writer.writeU8(2);
    writer.writeU8(1);
    writer.writeU8(1);
    writer.writeU8(3);
    writer.writeU8(1);
    writer.writeU8(0);
    writer.writeU64(50_000_000n);
    writer.writeU64(100_000_000n);
    writer.writeU64(98_000_000n);
    writer.writeU64(2_000_000n);
    writer.writeU64(0n);
    writer.writeU64(200n);
    writer.writeU64(300n);
    writer.writeU64(220n);
    writer.writeU64(120n);
    writer.writeU64(420n);
    writer.writeU64(120n);
    writer.writeU64(540n);
    writer.writeU64(0n);
    writer.writeBytes(creator);
    writer.writeBytes(vault);
    writer.writeBytes(reserve);
    writer.writeBytes(treasury);
    writer.writeBytes(new Uint8Array(32).fill(5));
    writer.writeBytes(Uint8Array.from([1, 0, 0, 0, 0]));
    writer.writeBytes(Uint8Array.from([0, 255, 255, 255]));
    writer.writeU16(7200);
    writer.writeU16(1800);
    writer.writeU16(800);
    writer.writeU16(0);

    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeBytes(index === 0 ? playerOne : index === 1 ? playerTwo : new Uint8Array(32));
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeU8(index === 0 ? PLAYER_STATUS.Revealed : index === 1 ? PLAYER_STATUS.Committed : PLAYER_STATUS.Empty);
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeU8(index === 0 ? 1 : 0);
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeU8(index === 0 ? 2 : 0);
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeU8(index === 0 ? 1 : 0);
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeBytes(index === 0 ? new Uint8Array(32).fill(7) : new Uint8Array(32));
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeBytes(index === 0 ? Uint8Array.from([1, 1, 1, 1, 1]) : new Uint8Array(5));
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeU16(index === 0 ? 4 : 0);
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeU32(index === 0 ? 170_500 : 0);
    }
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      writer.writeU64(index === 0 ? 72_000_000n : 0n);
    }

    expect(writer.getOffset()).toBe(ROOM_STATE_SIZE);

    const decoded = decodeRoomAccount(roomKey, bytes);

    expect(decoded.publicKey.equals(roomKey)).toBe(true);
    expect(decoded.status).toBe(ROOM_STATUS.Reveal);
    expect(decoded.stakeLamports).toBe(50_000_000n);
    expect(decoded.playerCount).toBe(2);
    expect(decoded.joinDurationSlots).toBe(220n);
    expect(decoded.finalHistogram).toEqual([1, 0, 0, 0, 0]);
    expect(decoded.playerKeys[0].equals(new PublicKey(playerOne))).toBe(true);
    expect(decoded.playerStatuses[1]).toBe(PLAYER_STATUS.Committed);
    expect(decoded.playerClaimed[0]).toBe(true);
    expect(decoded.playerRewardsLamports[0]).toBe(72_000_000n);
    expect(decoded.treasury.equals(new PublicKey(treasury))).toBe(true);
  });
});
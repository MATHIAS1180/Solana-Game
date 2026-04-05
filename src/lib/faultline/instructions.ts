import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

import { deriveReservePda, deriveRoomPda, deriveVaultPda } from "@/lib/faultline/pdas";
import type { Forecast, RiskBand, Zone } from "@/lib/faultline/types";

function createInstructionData(tag: number, parts: Uint8Array[] = []) {
  const totalLength = 1 + parts.reduce((sum, item) => sum + item.length, 0);
  const output = new Uint8Array(totalLength);
  output[0] = tag;

  let offset = 1;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return Buffer.from(output);
}

export async function createInitRoomIx(args: {
  programId: PublicKey;
  creator: PublicKey;
  presetId: number;
  roundId: bigint;
}) {
  const [roomPda] = await deriveRoomPda(args.programId, args.presetId);
  const [vaultPda] = await deriveVaultPda(args.programId, roomPda);
  const [reservePda] = await deriveReservePda(args.programId);
  const roundIdBytes = new Uint8Array(8);
  new DataView(roundIdBytes.buffer).setBigUint64(0, args.roundId, true);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.creator, isSigner: true, isWritable: true },
      { pubkey: roomPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: reservePda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: createInstructionData(0, [Uint8Array.from([args.presetId]), roundIdBytes])
  });
}

export async function createJoinRoomIx(args: {
  programId: PublicKey;
  player: PublicKey;
  room: PublicKey;
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.player, isSigner: true, isWritable: true },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: createInstructionData(1)
  });
}

export function createSubmitCommitIx(args: {
  programId: PublicKey;
  player: PublicKey;
  room: PublicKey;
  commitHash: Uint8Array;
}) {
  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.player, isSigner: true, isWritable: true },
      { pubkey: args.room, isSigner: false, isWritable: true }
    ],
    data: createInstructionData(2, [args.commitHash])
  });
}

export async function createJoinAndCommitIx(args: {
  programId: PublicKey;
  player: PublicKey;
  room: PublicKey;
  commitHash: Uint8Array;
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.player, isSigner: true, isWritable: true },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: createInstructionData(10, [args.commitHash])
  });
}

export function createRevealDecisionIx(args: {
  programId: PublicKey;
  player: PublicKey;
  room: PublicKey;
  zone: Zone;
  riskBand: RiskBand;
  forecast: Forecast;
  nonce: Uint8Array;
}) {
  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.player, isSigner: false, isWritable: true },
      { pubkey: args.room, isSigner: false, isWritable: true }
    ],
    data: createInstructionData(3, [Uint8Array.from([args.zone, args.riskBand]), Uint8Array.from(args.forecast), args.nonce])
  });
}

export async function createResolveGameIx(args: {
  programId: PublicKey;
  caller: PublicKey;
  room: PublicKey;
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);
  const [reservePda] = await deriveReservePda(args.programId);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.caller, isSigner: false, isWritable: false },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: reservePda, isSigner: false, isWritable: true }
    ],
    data: createInstructionData(4)
  });
}

export async function createClaimRewardIx(args: {
  programId: PublicKey;
  player: PublicKey;
  room: PublicKey;
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.player, isSigner: false, isWritable: true },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: createInstructionData(5)
  });
}

export async function createForceTimeoutIx(args: {
  programId: PublicKey;
  caller: PublicKey;
  room: PublicKey;
  refundPlayers?: PublicKey[];
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);
  const [reservePda] = await deriveReservePda(args.programId);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.caller, isSigner: false, isWritable: false },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: reservePda, isSigner: false, isWritable: true }
    ].concat((args.refundPlayers || []).map((player) => ({ pubkey: player, isSigner: false, isWritable: true }))),
    data: createInstructionData(6)
  });
}

export async function createCancelExpiredRoomIx(args: {
  programId: PublicKey;
  caller: PublicKey;
  room: PublicKey;
  refundPlayers?: PublicKey[];
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.caller, isSigner: false, isWritable: false },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true }
    ].concat((args.refundPlayers || []).map((player) => ({ pubkey: player, isSigner: false, isWritable: true }))),
    data: createInstructionData(7)
  });
}

export async function createEmergencyReturnIx(args: {
  programId: PublicKey;
  authority: PublicKey;
  room: PublicKey;
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true }
    ],
    data: createInstructionData(8)
  });
}

export async function createCloseRoomIx(args: {
  programId: PublicKey;
  caller: PublicKey;
  room: PublicKey;
}) {
  const [vaultPda] = await deriveVaultPda(args.programId, args.room);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.caller, isSigner: true, isWritable: true },
      { pubkey: args.room, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true }
    ],
    data: createInstructionData(9)
  });
}
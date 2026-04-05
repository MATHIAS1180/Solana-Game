import { PublicKey } from "@solana/web3.js";

const encoder = new TextEncoder();

export async function deriveRoomPda(programId: PublicKey, presetId: number) {
  return PublicKey.findProgramAddressSync([encoder.encode("room"), Uint8Array.from([presetId])], programId);
}

export async function deriveVaultPda(programId: PublicKey, roomPda: PublicKey) {
  return PublicKey.findProgramAddressSync([encoder.encode("vault"), roomPda.toBytes()], programId);
}

export async function deriveProfilePda(programId: PublicKey, player: PublicKey) {
  return PublicKey.findProgramAddressSync([encoder.encode("profile"), player.toBytes()], programId);
}

export async function deriveReservePda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([encoder.encode("reserve")], programId);
}
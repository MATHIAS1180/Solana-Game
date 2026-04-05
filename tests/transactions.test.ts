import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";

import { createResolveGameIx } from "@/lib/faultline/instructions";
import { buildTransactionErrorMessage, pollForSignatureConfirmation, sendAndConfirm } from "@/lib/solana/transactions";

describe("solana transactions", () => {
  it("returns the signature when the transaction is confirmed without error", async () => {
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: "blockhash-ok",
        lastValidBlockHeight: 42
      }),
      getSignatureStatuses: vi.fn().mockResolvedValue({
        value: [{ confirmationStatus: "confirmed", err: null }]
      }),
      getBlockHeight: vi.fn(),
      getTransaction: vi.fn()
    } as never;
    const sendTransaction = vi.fn().mockResolvedValue("signature-ok");

    const signature = await sendAndConfirm(connection, sendTransaction, new PublicKey(new Uint8Array(32).fill(1)), new Transaction());

    expect(signature).toBe("signature-ok");
    expect(sendTransaction).toHaveBeenCalledOnce();
  });

  it("surfaces on-chain errors with logs when the transaction fails after confirmation", async () => {
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: "blockhash-ko",
        lastValidBlockHeight: 84
      }),
      getSignatureStatuses: vi.fn().mockResolvedValue({
        value: [{ confirmationStatus: "confirmed", err: { InstructionError: [1, { Custom: 6008 }] } }]
      }),
      getBlockHeight: vi.fn(),
      getTransaction: vi.fn().mockResolvedValue({
        meta: {
          logMessages: ["Program log: JoinClosed"]
        }
      })
    } as never;
    const sendTransaction = vi.fn().mockResolvedValue("signature-ko");

    await expect(sendAndConfirm(connection, sendTransaction, new PublicKey(new Uint8Array(32).fill(2)), new Transaction())).rejects.toThrow(/deja assis dans cette room/);
  });

  it("waits for confirmation by polling over HTTP", async () => {
    const connection = {
      getSignatureStatuses: vi
        .fn()
        .mockResolvedValueOnce({ value: [null] })
        .mockResolvedValueOnce({ value: [{ confirmationStatus: "processed", err: null }] })
        .mockResolvedValueOnce({ value: [{ confirmationStatus: "confirmed", err: null }] }),
      getBlockHeight: vi.fn().mockResolvedValue(12)
    } as never;

    const result = await pollForSignatureConfirmation({
      connection,
      signature: "signature-poll",
      lastValidBlockHeight: 20,
      pollIntervalMs: 0
    });

    expect(result).toEqual({ err: null });
    expect(connection.getSignatureStatuses).toHaveBeenCalledTimes(3);
  });

  it("builds resolve instructions without passing a treasury account", async () => {
    const programId = new PublicKey(new Uint8Array(32).fill(3));
    const caller = new PublicKey(new Uint8Array(32).fill(4));
    const room = new PublicKey(new Uint8Array(32).fill(5));

    const instruction = await createResolveGameIx({ programId, caller, room });

    expect(instruction.keys).toHaveLength(4);
    expect(instruction.keys.at(-1)?.pubkey.equals(SystemProgram.programId)).toBe(false);
  });

  it("maps generic wallet rejection errors to a clearer message", async () => {
    const connection = {
      getTransaction: vi.fn().mockResolvedValue({ meta: { logMessages: [] } })
    } as never;

    await expect(buildTransactionErrorMessage(connection, "signature-rejected", new Error("User rejected the request."))).resolves.toMatch(/refusee dans le wallet/);
  });
});
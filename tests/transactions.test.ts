import { ComputeBudgetProgram, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";

import { createResolveGameIx } from "@/lib/faultline/instructions";
import { applyPriorityInstructions, buildTransactionErrorMessage, pollForSignatureConfirmation, sendAndConfirm } from "@/lib/solana/transactions";

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

  it("prepends compute budget instructions when a priority speed is requested", async () => {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(new Uint8Array(32).fill(9)),
        toPubkey: new PublicKey(new Uint8Array(32).fill(8)),
        lamports: 1
      })
    );

    applyPriorityInstructions(transaction, "balanced");

    expect(transaction.instructions[0]?.programId.equals(ComputeBudgetProgram.programId)).toBe(true);
    expect(transaction.instructions[1]?.programId.equals(ComputeBudgetProgram.programId)).toBe(true);
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

  it("retries once when the transaction expires before confirmation", async () => {
    const connection = {
      getLatestBlockhash: vi
        .fn()
        .mockResolvedValueOnce({ blockhash: "old-blockhash", lastValidBlockHeight: 42 })
        .mockResolvedValueOnce({ blockhash: "new-blockhash", lastValidBlockHeight: 84 }),
      getSignatureStatuses: vi
        .fn()
        .mockResolvedValueOnce({ value: [null] })
        .mockResolvedValueOnce({ value: [{ confirmationStatus: "confirmed", err: null }] }),
      getBlockHeight: vi.fn().mockResolvedValueOnce(43),
      getTransaction: vi.fn()
    } as never;
    const sendTransaction = vi.fn().mockResolvedValueOnce("signature-old").mockResolvedValueOnce("signature-new");

    const signature = await sendAndConfirm(connection, sendTransaction, new PublicKey(new Uint8Array(32).fill(1)), new Transaction(), {
      speed: "balanced",
      maxAttempts: 2
    });

    expect(signature).toBe("signature-new");
    expect(sendTransaction).toHaveBeenCalledTimes(2);
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
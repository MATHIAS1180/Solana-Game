import { PublicKey, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";

import { pollForSignatureConfirmation, sendAndConfirm } from "@/lib/solana/transactions";

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

    await expect(sendAndConfirm(connection, sendTransaction, new PublicKey(new Uint8Array(32).fill(2)), new Transaction())).rejects.toThrow(
      /Transaction failed \(signature-ko\).*JoinClosed/
    );
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
});
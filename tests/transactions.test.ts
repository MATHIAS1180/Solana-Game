import { PublicKey, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";

import { sendAndConfirm } from "@/lib/solana/transactions";

describe("solana transactions", () => {
  it("retourne la signature quand la transaction est confirmee sans erreur", async () => {
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: "blockhash-ok",
        lastValidBlockHeight: 42
      }),
      confirmTransaction: vi.fn().mockResolvedValue({
        context: { slot: 1 },
        value: { err: null }
      }),
      getTransaction: vi.fn()
    } as never;
    const sendTransaction = vi.fn().mockResolvedValue("signature-ok");

    const signature = await sendAndConfirm(connection, sendTransaction, new PublicKey(new Uint8Array(32).fill(1)), new Transaction());

    expect(signature).toBe("signature-ok");
    expect(sendTransaction).toHaveBeenCalledOnce();
  });

  it("remonte les erreurs on-chain avec les logs quand la transaction echoue apres confirmation", async () => {
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: "blockhash-ko",
        lastValidBlockHeight: 84
      }),
      confirmTransaction: vi.fn().mockResolvedValue({
        context: { slot: 1 },
        value: { err: { InstructionError: [1, { Custom: 6008 }] } }
      }),
      getTransaction: vi.fn().mockResolvedValue({
        meta: {
          logMessages: ["Program log: JoinClosed"]
        }
      })
    } as never;
    const sendTransaction = vi.fn().mockResolvedValue("signature-ko");

    await expect(sendAndConfirm(connection, sendTransaction, new PublicKey(new Uint8Array(32).fill(2)), new Transaction())).rejects.toThrow(
      /Transaction echouee \(signature-ko\).*JoinClosed/
    );
  });
});
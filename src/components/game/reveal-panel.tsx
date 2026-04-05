"use client";

import { useEffect, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Eye, LoaderCircle, TriangleAlert } from "lucide-react";

import { useToast } from "@/components/ui/toast-provider";
import { RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { createRevealDecisionIx } from "@/lib/faultline/instructions";
import { deleteStoredCommitPayload, getStoredCommitPayload } from "@/lib/faultline/storage";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm } from "@/lib/solana/transactions";

export function RevealPanel({
  room,
  onRevealed
}: {
  room: FaultlineRoomAccount;
  onRevealed: () => Promise<void>;
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const programId = getFaultlineProgramId();
  const toast = useToast();
  const [record, setRecord] = useState<Awaited<ReturnType<typeof getStoredCommitPayload>> | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    async function loadRecord() {
      if (!publicKey) {
        setRecord(null);
        return;
      }
      const nextRecord = await getStoredCommitPayload(room.publicKey.toBase58(), publicKey.toBase58());
      setRecord(nextRecord || null);
    }

    void loadRecord();
  }, [publicKey, room.publicKey]);

  async function reveal() {
    if (!publicKey || !sendTransaction || !programId || !record) {
      toast({
        tone: "error",
        title: "Reveal payload missing",
        description: "The saved commit payload was not found locally for this wallet and room."
      });
      return;
    }

    try {
      setPending(true);

      const instruction = createRevealDecisionIx({
        programId,
        player: publicKey,
        room: room.publicKey,
        zone: record.zone,
        riskBand: record.riskBand,
        forecast: record.forecast,
        nonce: Uint8Array.from(record.nonce)
      });

      await sendAndConfirm(connection, sendTransaction, publicKey, new Transaction().add(instruction));
      await deleteStoredCommitPayload(room.publicKey.toBase58(), publicKey.toBase58());
      toast({
        tone: "success",
        title: "Reveal submitted",
        description: "The revealed payload matched the stored commit and was sent to Solana."
      });
      await onRevealed();
    } catch (error) {
      toast({
        tone: "error",
        title: "Reveal failed",
        description: error instanceof Error ? error.message : "The reveal transaction could not be completed."
      });
    } finally {
      setPending(false);
    }
  }

  if (!record) {
    return (
      <div className="fault-card rounded-[1.75rem] p-6">
        <div className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-fault-flare">
          <TriangleAlert className="size-4" />
          Reveal unavailable
        </div>
        <p className="mt-4 text-sm leading-7 text-white/70">
          The committed payload was not found locally for this wallet and room. Without the original nonce and forecast, manual reveal is impossible.
        </p>
      </div>
    );
  }

  return (
    <div className="fault-card rounded-[1.75rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="arena-kicker">Reveal Step</p>
          <h2 className="mt-3 font-display text-2xl text-white">Replay the exact payload that was committed.</h2>
        </div>
        <Eye className="size-5 text-fault-flare" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Zone</p>
          <p className="mt-2 text-xl text-white">{ZONE_LABELS[record.zone]}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Risk band</p>
          <p className="mt-2 text-xl text-white">{RISK_LABELS[record.riskBand]}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Forecast</p>
          <p className="mt-2 font-mono text-xl text-white">[{record.forecast.join(", ")}]</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void reveal()}
        disabled={pending}
        className="arena-secondary mt-6 inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
        Submit reveal
      </button>
    </div>
  );
}
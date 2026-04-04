"use client";

import { useEffect, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Eye, LoaderCircle, TriangleAlert } from "lucide-react";

import { RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { createRevealDecisionIx } from "@/lib/faultline/instructions";
import { deriveProfilePda } from "@/lib/faultline/pdas";
import { deleteStoredCommitPayload, getStoredCommitPayload } from "@/lib/faultline/storage";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm } from "@/lib/solana/transactions";

async function deleteAutomationPayload(room: string, player: string) {
  await fetch("/api/automation/commit", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ room, player })
  });
}

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
  const [record, setRecord] = useState<Awaited<ReturnType<typeof getStoredCommitPayload>> | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("Payload reveal introuvable localement ou wallet absent.");
      return;
    }

    try {
      setPending(true);
      setMessage(null);

      const [profile] = await deriveProfilePda(programId, publicKey);
      const instruction = createRevealDecisionIx({
        programId,
        player: publicKey,
        room: room.publicKey,
        profile,
        zone: record.zone,
        riskBand: record.riskBand,
        forecast: record.forecast,
        nonce: Uint8Array.from(record.nonce)
      });

      await sendAndConfirm(connection, sendTransaction, publicKey, new Transaction().add(instruction));
      await deleteStoredCommitPayload(room.publicKey.toBase58(), publicKey.toBase58());
      await deleteAutomationPayload(room.publicKey.toBase58(), publicKey.toBase58()).catch(() => undefined);
      setMessage("Reveal transmis et verifie contre le commit stocke.");
      await onRevealed();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reveal echoue.");
    } finally {
      setPending(false);
    }
  }

  if (!record) {
    return (
      <div className="fault-card rounded-[1.75rem] p-6">
        <div className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-fault-flare">
          <TriangleAlert className="size-4" />
          Reveal indisponible
        </div>
        <p className="mt-4 text-sm leading-7 text-white/70">
          Le payload committe n’a pas ete retrouve localement pour ce wallet et cette room. Sans le nonce et le forecast originel, le reveal manuel est impossible. Si le commit a ete synchronise au backend, le relayer Vercel peut encore faire ce reveal automatiquement.
        </p>
      </div>
    );
  }

  return (
    <div className="fault-card rounded-[1.75rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Reveal</p>
          <h2 className="mt-3 font-display text-2xl text-white">Rejouer exactement ce qui a ete committe</h2>
        </div>
        <Eye className="size-5 text-fault-flare" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Zone</p>
          <p className="mt-2 text-xl text-white">{ZONE_LABELS[record.zone]}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Risk Band</p>
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
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-fault-flare px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-fault-basalt disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
        Soumettre le reveal
      </button>

      {message ? <p className="mt-4 text-sm text-white/72">{message}</p> : null}
    </div>
  );
}
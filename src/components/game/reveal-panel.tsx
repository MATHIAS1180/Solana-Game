"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Eye, LoaderCircle, TriangleAlert, Upload } from "lucide-react";

import { useToast } from "@/components/ui/toast-provider";
import { buildCommitHash, parseStoredCommitPayload, toHex } from "@/lib/faultline/commit";
import { RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { createRevealDecisionIx } from "@/lib/faultline/instructions";
import { deleteStoredCommitPayload, getStoredCommitPayload, persistCommitPayload } from "@/lib/faultline/storage";
import type { FaultlineRoomAccount, StoredCommitPayload } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm } from "@/lib/solana/transactions";
import { cn } from "@/lib/utils";

async function clearRelayBackup(room: string, player: string) {
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
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [record, setRecord] = useState<StoredCommitPayload | null>(null);
  const [pending, setPending] = useState(false);

  const integrity = useMemo(() => {
    if (!record) {
      return null;
    }

    try {
      const commitHash = buildCommitHash(
        {
          room: new PublicKey(record.room),
          player: new PublicKey(record.player),
          roundId: BigInt(record.roundId),
          zone: record.zone,
          riskBand: record.riskBand,
          forecast: record.forecast,
          nonce: Uint8Array.from(record.nonce)
        },
        record.commitVersion
      );
      const computedHex = toHex(commitHash);
      const storedHex = toHex(Uint8Array.from(record.commitHash));

      return {
        matches: computedHex === storedHex,
        shortHash: `${storedHex.slice(0, 10)}...${storedHex.slice(-8)}`,
        versionLabel: record.commitVersion === 1 ? "Legacy V1 seal" : `Seal V${record.commitVersion}`,
        createdLabel: new Date(record.createdAt).toLocaleString()
      };
    } catch {
      return {
        matches: false,
        shortHash: "corrupted",
        versionLabel: `Seal V${record.commitVersion}`,
        createdLabel: new Date(record.createdAt).toLocaleString()
      };
    }
  }, [record]);

  useEffect(() => {
    async function loadRecord() {
      if (!publicKey) {
        setRecord(null);
        return;
      }
      const nextRecord = await getStoredCommitPayload(room.publicKey.toBase58(), publicKey.toBase58());
      setRecord(nextRecord ? { ...nextRecord } : null);
    }

    void loadRecord();
  }, [publicKey, room.publicKey]);

  async function importRecoveryFile(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const raw = parseStoredCommitPayload(JSON.parse(await file.text()) as unknown, room.createdSlot);

      if (raw.room !== room.publicKey.toBase58()) {
        throw new Error("This recovery file belongs to a different room.");
      }

      if (publicKey && raw.player !== publicKey.toBase58()) {
        throw new Error("This recovery file belongs to another wallet.");
      }

      await persistCommitPayload(raw);
      setRecord(raw);
      toast({
        tone: "success",
        title: "Recovery file loaded",
        description: "The reveal payload is back in local storage for this room and wallet.",
        durationMs: 6200
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "Import failed",
        description: error instanceof Error ? error.message : "The recovery file could not be parsed."
      });
    }
  }

  async function reveal() {
    if (!publicKey || !sendTransaction || !programId || !record) {
      toast({
        tone: "error",
        title: "Reveal payload missing",
        description: "The saved commit payload was not found locally for this wallet and room."
      });
      return;
    }

    if (!integrity?.matches) {
      toast({
        tone: "error",
        title: "Seal mismatch",
        description: "The stored reveal payload no longer matches its original commit hash. Import a valid recovery file before revealing."
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
      void clearRelayBackup(room.publicKey.toBase58(), publicKey.toBase58());
      toast({
        tone: "success",
        title: "Reveal confirmed",
        description: "Your hidden read matched the stored commit and is now part of the live room outcome.",
        durationMs: 5800
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
          The committed payload was not found locally for this wallet and room. Without the original nonce and forecast, this seat cannot prove what it locked earlier.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            void importRecoveryFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="arena-secondary mt-6 inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em]"
        >
          <Upload className="size-4" />
          Import recovery file
        </button>
      </div>
    );
  }

  return (
    <div className="fault-card rounded-[1.75rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="arena-kicker">Reveal Step</p>
          <h2 className="mt-3 font-display text-2xl text-white">Open the sealed read and let the room score it.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
            Reveal must replay the exact hidden payload. Any mismatch breaks the proof, so this step is binary: exact or invalid.
          </p>
        </div>
        <Eye className="size-5 text-fault-flare" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Seal</p>
          <p className="mt-2 text-white">{integrity?.versionLabel}</p>
          <p className={cn("mt-2 text-xs uppercase tracking-[0.22em]", integrity?.matches ? "text-fault-signal" : "text-fault-flare")}>{integrity?.matches ? "Integrity check passed" : "Integrity check failed"}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commit hash</p>
          <p className="mt-2 font-mono text-white">{integrity?.shortHash}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Round id</p>
          <p className="mt-2 font-mono text-white">#{record.roundId}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-white/74">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Local commit time</p>
          <p className="mt-2 text-white">{integrity?.createdLabel}</p>
        </div>
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
        disabled={pending || !integrity?.matches}
        className="arena-secondary mt-6 inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
        Break seal and reveal exact read
      </button>
    </div>
  );
}
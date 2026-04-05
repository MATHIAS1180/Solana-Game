"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Download, Eye, LoaderCircle, ShieldCheck, TriangleAlert, Upload } from "lucide-react";

import { TransactionSpeedControl } from "@/components/game/transaction-speed-control";
import { HistogramBar } from "@/components/ui/histogram-bar";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast-provider";
import { buildCommitHash, parseStoredCommitPayload, toHex } from "@/lib/faultline/commit";
import { RISK_LABELS, ZONE_LABELS } from "@/lib/faultline/constants";
import { createRevealDecisionIx } from "@/lib/faultline/instructions";
import { deleteStoredCommitPayload, getStoredCommitPayload, persistCommitPayload } from "@/lib/faultline/storage";
import type { FaultlineRoomAccount, StoredCommitPayload } from "@/lib/faultline/types";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm, type TransactionSpeed } from "@/lib/solana/transactions";
import { cn } from "@/lib/utils";

type RelayRecoveryStatus = {
  checking: boolean;
  configured: boolean;
  mirrored: boolean;
  ttlDays: number;
  error: string | null;
};

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
  const [transactionSpeed, setTransactionSpeed] = useState<TransactionSpeed>("balanced");
  const [relayRecoveryStatus, setRelayRecoveryStatus] = useState<RelayRecoveryStatus>({
    checking: true,
    configured: false,
    mirrored: false,
    ttlDays: 7,
    error: null
  });

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

  useEffect(() => {
    let cancelled = false;

    async function loadRelayRecoveryStatus() {
      try {
        const query = publicKey
          ? `/api/automation/commit?room=${encodeURIComponent(room.publicKey.toBase58())}&player=${encodeURIComponent(publicKey.toBase58())}`
          : "/api/automation/commit";
        const response = await fetch(query, { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          configured?: boolean;
          mirrored?: boolean;
          ttlDays?: number;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Unable to check relay recovery status.");
        }

        if (!cancelled) {
          setRelayRecoveryStatus({
            checking: false,
            configured: Boolean(payload.configured),
            mirrored: Boolean(payload.mirrored),
            ttlDays: payload.ttlDays ?? 7,
            error: null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setRelayRecoveryStatus({
            checking: false,
            configured: false,
            mirrored: false,
            ttlDays: 7,
            error: error instanceof Error ? error.message : "Unable to check relay recovery status."
          });
        }
      }
    }

    void loadRelayRecoveryStatus();

    return () => {
      cancelled = true;
    };
  }, [publicKey, room.publicKey]);

  function exportRecoveryFile() {
    if (!record) {
      return;
    }

    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `faultline-reveal-${room.publicKey.toBase58().slice(0, 8)}-${record.roundId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({
      tone: "success",
      title: "Recovery exported",
      description: "A local backup of this sealed payload has been downloaded.",
      durationMs: 5200
    });
  }

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

      await sendAndConfirm(connection, sendTransaction, publicKey, new Transaction().add(instruction), {
        speed: transactionSpeed,
        maxAttempts: transactionSpeed === "none" ? 1 : 2
      });
      await deleteStoredCommitPayload(room.publicKey.toBase58(), publicKey.toBase58());
      void clearRelayBackup(room.publicKey.toBase58(), publicKey.toBase58());
      toast({
        tone: "game",
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
        <div className="arena-editorial-panel rounded-[1.6rem] p-5">
          <div className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-fault-flare">
            <TriangleAlert className="size-4" />
            Reveal unavailable
          </div>
          <h2 className="mt-3 font-display text-3xl text-white">The browser no longer holds the sealed payload.</h2>
          <p className="mt-3 text-sm leading-7 text-white/72">
            Without the original nonce and forecast, this seat cannot reveal manually from this device.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/72">
          <div className="flex flex-wrap gap-2">
            <span className="arena-chip" data-tone={relayRecoveryStatus.mirrored ? "signal" : "ember"}>
              {relayRecoveryStatus.mirrored ? "Relay mirror found" : "No relay mirror"}
            </span>
            <span className="arena-chip" data-tone={relayRecoveryStatus.configured ? "flare" : "ember"}>
              {relayRecoveryStatus.configured ? `Retention ${relayRecoveryStatus.ttlDays}d` : "Relay disabled"}
            </span>
          </div>
          <p className="mt-3 text-white/82">
            {relayRecoveryStatus.checking
              ? "Checking whether a relay mirror still exists for this seat."
              : relayRecoveryStatus.mirrored
                ? `A relay mirror still exists for this room and wallet. Automation can still protect this reveal for up to ${relayRecoveryStatus.ttlDays} days after commit.`
                : relayRecoveryStatus.configured
                  ? "No relay mirror was found for this seat. Manual reveal now requires an exported recovery file."
                  : relayRecoveryStatus.error ?? "Relay recovery is not configured here, so only exported recovery files can restore manual reveal on another device."}
          </p>
        </div>
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

  const forecastTotal = record.forecast.reduce((sum, value) => sum + value, 0);

  return (
    <div className="fault-card rounded-[1.75rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="arena-kicker">Reveal</p>
          <h2 className="mt-3 font-display text-2xl text-white">Open the exact sealed read.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
            This step is binary: the stored payload matches the seal, or it does not.
          </p>
        </div>
        <Eye className="size-5 text-fault-flare" />
      </div>

      <div className="arena-proof-shell mt-6 rounded-[1.6rem] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="arena-chip" data-tone={integrity?.matches ? "signal" : "ember"}>
            <ShieldCheck className="size-3.5" />
            {integrity?.matches ? "Hash checking passed" : "Hash checking failed"}
          </span>
          <span className="arena-chip">{integrity?.versionLabel}</span>
          <span className="arena-chip">Round #{record.roundId}</span>
        </div>

        <h3 className={cn("mt-5 font-display text-3xl text-white", !integrity?.matches && "text-fault-flare")}>
          {integrity?.matches ? "Byte-for-byte match confirmed" : "The stored payload no longer matches the seal"}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Commit hash</p>
            <p className="mt-2 font-mono text-white">{integrity?.shortHash}</p>
          </div>
          <div className="arena-proof-card rounded-2xl p-4 text-sm text-white/74">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Local commit time</p>
            <p className="mt-2 text-white">{integrity?.createdLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Zone" value={ZONE_LABELS[record.zone]} subtext="Lane encoded in the sealed payload." />
        <StatCard label="Risk band" value={RISK_LABELS[record.riskBand]} subtext="Payout posture encoded at commit time." />
        <StatCard label="Forecast total" value={forecastTotal} subtext="Final population implied by this seal." />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        {record.forecast.map((value, index) => (
          <HistogramBar
            key={`${ZONE_LABELS[index]}-reveal`}
            label={ZONE_LABELS[index]}
            value={value}
            total={forecastTotal}
            highlighted={record.zone === index}
            tone={record.zone === index ? "flare" : "signal"}
          />
        ))}
      </div>

      <div className="mt-6">
        <TransactionSpeedControl value={transactionSpeed} onChange={setTransactionSpeed} compact />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void reveal()}
          disabled={pending || !integrity?.matches}
          className="arena-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
          Reveal exact read
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="arena-secondary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em]"
        >
          <Upload className="size-4" />
          Import another recovery file
        </button>
        <button
          type="button"
          onClick={exportRecoveryFile}
          className="arena-secondary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] sm:col-span-2"
        >
          <Download className="size-4" />
          Export sealed backup
        </button>
      </div>
    </div>
  );
}
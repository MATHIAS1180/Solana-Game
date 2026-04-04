"use client";

import { useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { Flame, LoaderCircle } from "lucide-react";

import { DEFAULT_ROOM_PRESETS } from "@/lib/faultline/constants";
import { createInitRoomIx } from "@/lib/faultline/instructions";
import { deriveRoomPda } from "@/lib/faultline/pdas";
import { getFaultlineProgramId } from "@/lib/solana/cluster";
import { sendAndConfirm } from "@/lib/solana/transactions";
import { explorerLink, formatLamports } from "@/lib/utils";

function randomRoomSeed() {
  const output = new Uint8Array(32);
  crypto.getRandomValues(output);
  return output;
}

export function CreateRoomForm() {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const programId = getFaultlineProgramId();
  const [presetId, setPresetId] = useState<number>(DEFAULT_ROOM_PRESETS[1].id);
  const [stakeSol, setStakeSol] = useState((DEFAULT_ROOM_PRESETS[1].stakeLamports / LAMPORTS_PER_SOL).toString());
  const [minPlayers, setMinPlayers] = useState<number>(DEFAULT_ROOM_PRESETS[1].minPlayers);
  const [maxPlayers, setMaxPlayers] = useState<number>(DEFAULT_ROOM_PRESETS[1].maxPlayers);
  const [joinWindowSlots, setJoinWindowSlots] = useState<number>(DEFAULT_ROOM_PRESETS[1].joinWindowSlots);
  const [commitWindowSlots, setCommitWindowSlots] = useState<number>(DEFAULT_ROOM_PRESETS[1].commitWindowSlots);
  const [revealWindowSlots, setRevealWindowSlots] = useState<number>(DEFAULT_ROOM_PRESETS[1].revealWindowSlots);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedPreset = DEFAULT_ROOM_PRESETS.find((preset) => preset.id === presetId) || DEFAULT_ROOM_PRESETS[1];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!programId || !publicKey || !sendTransaction) {
      setFeedback("Wallet non connecte ou Program ID indisponible.");
      return;
    }

    try {
      setPending(true);
      setFeedback(null);

      const roomSeed = randomRoomSeed();
      const [roomPda] = await deriveRoomPda(programId, roomSeed);
      const instruction = await createInitRoomIx({
        programId,
        creator: publicKey,
        roomSeed,
        stakeLamports: BigInt(Math.round(Number(stakeSol) * LAMPORTS_PER_SOL)),
        minPlayers,
        maxPlayers,
        joinWindowSlots,
        commitWindowSlots,
        revealWindowSlots,
        presetId
      });
      const signature = await sendAndConfirm(connection, sendTransaction, publicKey, new Transaction().add(instruction));
      setFeedback(`Room creee. Signature: ${signature}`);
      router.push(`/rooms/${roomPda.toBase58()}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Creation de room echouee.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="fault-card rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-fault-flare">Create Room</p>
          <h2 className="mt-3 font-display text-3xl text-white">Lancer une nouvelle room devnet</h2>
        </div>
        <div className="rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-fault-flare">
          {selectedPreset.name}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-white/74">
          <span>Preset</span>
          <select
            value={presetId}
            onChange={(event) => {
              const nextPreset = DEFAULT_ROOM_PRESETS.find((preset) => preset.id === Number(event.target.value));
              if (!nextPreset) {
                return;
              }
              setPresetId(nextPreset.id);
              setStakeSol((nextPreset.stakeLamports / LAMPORTS_PER_SOL).toString());
              setMinPlayers(nextPreset.minPlayers);
              setMaxPlayers(nextPreset.maxPlayers);
              setJoinWindowSlots(nextPreset.joinWindowSlots);
              setCommitWindowSlots(nextPreset.commitWindowSlots);
              setRevealWindowSlots(nextPreset.revealWindowSlots);
            }}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          >
            {DEFAULT_ROOM_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-white/74">
          <span>Stake par joueur</span>
          <input
            value={stakeSol}
            onChange={(event) => setStakeSol(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            inputMode="decimal"
          />
        </label>

        <label className="space-y-2 text-sm text-white/74">
          <span>Min players</span>
          <input
            type="number"
            min={2}
            max={128}
            value={minPlayers}
            onChange={(event) => setMinPlayers(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          />
        </label>

        <label className="space-y-2 text-sm text-white/74">
          <span>Max players</span>
          <input
            type="number"
            min={2}
            max={128}
            value={maxPlayers}
            onChange={(event) => setMaxPlayers(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          />
        </label>

        <label className="space-y-2 text-sm text-white/74">
          <span>Join window (slots)</span>
          <input
            type="number"
            min={10}
            value={joinWindowSlots}
            onChange={(event) => setJoinWindowSlots(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          />
        </label>

        <label className="space-y-2 text-sm text-white/74">
          <span>Commit / Reveal windows (slots)</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={10}
              value={commitWindowSlots}
              onChange={(event) => setCommitWindowSlots(Number(event.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
            <input
              type="number"
              min={10}
              value={revealWindowSlots}
              onChange={(event) => setRevealWindowSlots(Number(event.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </div>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Preview</p>
          <p className="mt-2">{selectedPreset.description}</p>
          <p className="mt-2 text-white/90">Pot theorique a {maxPlayers} joueurs: {formatLamports(BigInt(Math.round(Number(stakeSol) * LAMPORTS_PER_SOL * maxPlayers)))}</p>
        </div>
        <button
          type="submit"
          disabled={pending || !publicKey || !programId}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-fault-ember px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-fault-basalt disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Flame className="size-4" />}
          Creer la room
        </button>
      </div>

      {feedback ? (
        <p className="mt-4 text-sm text-white/75">
          {feedback.includes("Signature") ? (
            <a href={explorerLink(feedback.split(": ")[1], "tx")} target="_blank" rel="noreferrer" className="text-fault-flare underline-offset-4 hover:underline">
              {feedback}
            </a>
          ) : (
            feedback
          )}
        </p>
      ) : null}
    </form>
  );
}
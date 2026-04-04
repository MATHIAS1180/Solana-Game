"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";

import { DEFAULT_ROOM_PRESETS } from "@/lib/faultline/constants";
import { formatLamports } from "@/lib/utils";

export function CreateRoomForm() {
  const router = useRouter();
  const [pendingPresetId, setPendingPresetId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function enterPreset(presetId: number) {
    try {
      setPendingPresetId(presetId);
      setMessage(null);

      const response = await fetch(`/api/rooms/system/${presetId}`, {
        method: "POST",
        cache: "no-store"
      });
      const payload = (await response.json()) as { ok: boolean; error?: string; roomAddress?: string };

      if (!response.ok || !payload.ok || !payload.roomAddress) {
        throw new Error(payload.error || "Impossible de preparer la room.");
      }

      router.push(`/rooms/${payload.roomAddress}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de preparer la room.");
    } finally {
      setPendingPresetId(null);
    }
  }

  return (
    <section className="fault-card rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-fault-flare">System Rooms</p>
          <h2 className="mt-3 font-display text-3xl text-white">Rooms toujours disponibles</h2>
        </div>
        <div className="rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-fault-flare">
          On demand
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {DEFAULT_ROOM_PRESETS.map((preset) => (
          <div key={preset.id} className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-white/75">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-xl text-white">{preset.name}</p>
              <Sparkles className="size-4 text-fault-flare" />
            </div>
            <p className="mt-2">{preset.description}</p>
            <p className="mt-3 text-white/92">{formatLamports(preset.stakeLamports)} par joueur</p>
            <p className="mt-1 text-white/58">{preset.minPlayers}-{preset.maxPlayers} joueurs</p>
            <button
              type="button"
              onClick={() => void enterPreset(preset.id)}
              disabled={pendingPresetId !== null}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-3 font-display text-xs uppercase tracking-[0.22em] text-fault-flare transition hover:border-fault-flare hover:bg-fault-flare/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingPresetId === preset.id ? "Preparation..." : "Entrer dans cette room"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Mode actuel</p>
          <p className="mt-2">Chaque preset reste visible en permanence. Une vraie room on-chain n'est ouverte qu'au moment ou un joueur entre, ce qui fait partir le decompte sans spammer le programme.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 font-display text-sm uppercase tracking-[0.2em] text-white/80">
          <LockKeyhole className="size-4 text-fault-flare" />
          Activation a l'entree
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-fault-flare">{message}</p> : null}
    </section>
  );
}
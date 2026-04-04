"use client";

import { LockKeyhole, Sparkles } from "lucide-react";

export function CreateRoomForm() {
  return (
    <section className="fault-card rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-fault-flare">Preset Rooms</p>
          <h2 className="mt-3 font-display text-3xl text-white">Lobbies permanents par mise</h2>
        </div>
        <div className="rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-fault-flare">
          Wallet only
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/70">
        <div>
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Mode actuel</p>
          <p className="mt-2">Chaque mise dispose maintenant d'un lobby permanent visible en continu. Tant qu'aucun joueur n'entre, il n'existe pas encore de room on-chain et aucun chrono ne tourne.</p>
        </div>
        <div>
          <p className="mt-2">Le premier joueur ouvre l'instance on-chain et prend automatiquement la premiere place. Si la room expire sous le minimum de joueurs, n'importe qui peut l'annuler depuis la carte du preset et le lobby reste disponible.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/72">
        <Sparkles className="size-4 text-fault-flare" />
        <p>Les cartes a droite representent toujours les rooms 0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64 et 1 SOL.</p>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 font-display text-sm uppercase tracking-[0.2em] text-white/80">
        <LockKeyhole className="size-4 text-fault-flare" />
        Sans relayer
      </div>
    </section>
  );
}
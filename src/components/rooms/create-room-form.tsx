"use client";

import { LockKeyhole, Sparkles, Waves } from "lucide-react";

export function CreateRoomForm() {
  return (
    <section className="fault-card rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <p className="arena-kicker">Preset Arenas</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight text-white sm:text-4xl">Persistent stake lobbies built for one-signature entry.</h2>
        </div>
        <div className="self-start rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-fault-flare">
          Wallet native
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="arena-stat rounded-[1.6rem] p-5 text-sm leading-7 text-white/70">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">How it works</p>
          <p className="mt-3">
            Every stake bracket owns a permanent on-chain room. The account appears on first use, then resets after each round instead of being destroyed.
          </p>
        </div>
        <div className="arena-stat rounded-[1.6rem] p-5 text-sm leading-7 text-white/70">
          <p className="font-mono uppercase tracking-[0.22em] text-white/45">Why it matters</p>
          <p className="mt-3">
            Players no longer send a standalone join transaction. They open the room, set their read, and sign once to initialize if needed, join, and commit.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/72">
        <Sparkles className="size-4 text-fault-flare" />
        <p>The live board always exposes the eight official presets: 0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, and 1 SOL.</p>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/72">
        <Waves className="size-4 text-fault-signal" />
        <p>If a room misses minimum players, the next reset path can automatically refund wallets before re-opening the arena.</p>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm leading-7 text-white/72">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">What keeps players engaged</p>
        <p className="mt-3">
          The friction is low, but the decision weight is high. Every entry asks one question: can you read how the rest of the room will distribute before reveal time?
        </p>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 font-display text-sm uppercase tracking-[0.2em] text-white/80">
        <LockKeyhole className="size-4 text-fault-flare" />
        Relayer optional
      </div>
    </section>
  );
}
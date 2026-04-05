import Link from "next/link";
import Script from "next/script";

import { ArrowRight, Compass, LockKeyhole, Sparkles, Swords, Waves } from "lucide-react";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Faultline Arena",
    description:
      "Faultline Arena is a Solana PvP strategy game where players predict crowd movement, commit privately, reveal later, and compete in deterministic on-chain rankings.",
    genre: ["Strategy", "PvP", "Web3"],
    gamePlatform: "Web Browser",
    applicationCategory: "Game",
    operatingSystem: "Web Browser"
  };

  return (
    <main className="fault-grid fault-section min-h-screen">
      <Script id="faultline-arena-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-10 md:px-10 lg:px-12">
        <div className="arena-fade-in flex flex-col gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/72 backdrop-blur md:flex-row md:items-center md:justify-between">
          <span className="font-mono uppercase tracking-[0.32em] text-fault-flare">Faultline Arena / Solana Devnet</span>
          <span>One-transaction entry, commit-reveal PvP, no RNG, no oracle, pure player reads.</span>
        </div>

        <div className="grid gap-10 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="arena-fade-in space-y-8">
            <div className="arena-kicker">
              <Sparkles className="size-4" />
              Solana prediction strategy game
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl font-display text-5xl font-semibold leading-[0.94] text-white md:text-7xl xl:text-[5.5rem]">
                Predict the crowd. Lock the commit. Win the reveal.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-white/72 md:text-xl">
                Faultline Arena is the live frontend for a deterministic Solana PvP strategy game. Every player secretly picks a zone,
                a risk band, and a crowd forecast, then reveals the exact read later to compete in transparent on-chain rankings.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/rooms" className="arena-primary fault-ring">
                Enter the arena
                <ArrowRight className="size-4" />
              </Link>
              <a href="#how-it-works" className="arena-secondary">
                Explore the mechanics
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["1 Tx entry", "Create if needed, join, and commit from one wallet flow."],
                ["Deterministic scoring", "Ranks come from real reveals, forecast error, and risk-weighted outcomes."],
                ["Live persistent lobbies", "Every stake tier stays visible so players can jump into active action faster."]
              ].map(([title, text]) => (
                <div key={title} className="arena-stat rounded-[1.5rem] p-4">
                  <p className="font-display text-lg text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/62">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="fault-card arena-fade-in rounded-[2.2rem] p-6 sm:p-8">
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.24em] text-white/50">
              <span>Core loop</span>
              <span>5 zones / 3 risks</span>
            </div>
            <div className="mt-8 space-y-6">
              {[
                {
                  icon: LockKeyhole,
                  title: "Private commit",
                  text: "The client hashes your canonical payload locally, so the chain only sees the commitment until reveal time."
                },
                {
                  icon: Swords,
                  title: "Verifiable reveal",
                  text: "Zone, risk band, forecast, and nonce are checked byte-for-byte against the stored commit."
                },
                {
                  icon: Waves,
                  title: "Deterministic resolution",
                  text: "Final standings come from the real reveal histogram, forecast error, and risk logic. No hidden referee."
                }
              ].map((item) => (
                <div key={item.title} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                  <item.icon className="size-5 text-fault-signal" />
                  <h2 className="mt-4 font-display text-xl text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-white/68">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section id="how-it-works" className="grid gap-4 pb-6 md:grid-cols-3">
          {[
            ["1. Enter", "Pick a persistent stake lobby, pay the ticket, and secure your seat with a single wallet flow."],
            ["2. Commit", "Choose your zone, risk profile, and crowd forecast, then hash everything locally before sending."],
            ["3. Reveal", "Submit the exact payload later. The program proves you never changed your read after the commit."]
          ].map(([title, text]) => (
            <div key={title} className="fault-card arena-fade-in rounded-[1.7rem] p-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">{title}</p>
              <p className="mt-3 text-sm leading-7 text-white/72">{text}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 pb-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="fault-card arena-fade-in rounded-[1.9rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">Why it stands out</p>
            <h2 className="mt-4 font-display text-3xl text-white">Built for players who want readable, provable strategy.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                Icon: Compass,
                title: "Crowd reading",
                text: "You are not predicting a price chart. You are predicting where real players will cluster."
              },
              {
                Icon: Sparkles,
                title: "Readable risk",
                text: "Calm, Edge, and Knife let players trade consistency for explosive upside."
              },
              {
                Icon: Swords,
                title: "Permissionless flow",
                text: "Timeouts, resolution, and claims stay open to any visitor so matches keep moving."
              }
            ].map(({ Icon, title, text }) => (
              <div key={title} className="fault-card arena-fade-in rounded-[1.7rem] p-5">
                <Icon className="size-5 text-fault-flare" />
                <h3 className="mt-4 font-display text-xl text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/66">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
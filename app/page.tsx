import Link from "next/link";

import { ArrowRight, ShieldCheck, Sparkles, Swords } from "lucide-react";

export default function HomePage() {
  return (
    <main className="fault-grid fault-section min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-10 md:px-10 lg:px-12">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 backdrop-blur">
          <span className="font-mono uppercase tracking-[0.3em] text-fault-flare">Faultline / Devnet</span>
          <span>Commit-reveal PvP sans RNG, sans oracle, 100% decisions humaines</span>
        </div>

        <div className="grid gap-10 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-fault-ember/30 bg-fault-ember/10 px-4 py-2 text-sm uppercase tracking-[0.25em] text-fault-flare">
              <Sparkles className="size-4" />
              Tension, foule, revelation
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl font-semibold leading-none text-white md:text-7xl">
                Lis la foule avant qu&apos;elle ne te lise.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/72 md:text-xl">
                Faultline est un jeu PvP web3 sur Solana devnet. Chaque joueur verrouille en secret sa zone, son niveau de risque et son forecast, puis le protocole revele et classe les meilleurs lecteurs de congestion sociale.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/rooms"
                className="fault-ring inline-flex items-center justify-center gap-2 rounded-full bg-fault-ember px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-fault-basalt transition hover:translate-y-[-1px] hover:bg-fault-flare"
              >
                Entrer dans les rooms
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/82 transition hover:border-white/30 hover:bg-white/5"
              >
                Comprendre le protocole
              </a>
            </div>
          </div>

          <div className="fault-card rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.24em] text-white/50">
              <span>Core Loop</span>
              <span>5 zones / 3 risks</span>
            </div>
            <div className="mt-8 space-y-6">
              {[
                {
                  icon: ShieldCheck,
                  title: "Commit opaque",
                  text: "Le client hash le payload canonique localement. Rien d’autre qu’un SHA256 n’est envoye on-chain."
                },
                {
                  icon: Swords,
                  title: "Reveal verifiable",
                  text: "Zone, risk band, forecast et nonce sont verifies byte a byte contre le commit stocke."
                },
                {
                  icon: Sparkles,
                  title: "Resolve deterministe",
                  text: "Le classement vient uniquement de l’histogramme reel et de l’erreur de forecast. Aucun arbitre."
                }
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <item.icon className="size-5 text-fault-flare" />
                  <h2 className="mt-4 font-display text-xl text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-white/68">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section id="how-it-works" className="grid gap-4 pb-6 md:grid-cols-3">
          {[
            ["1. Join", "Entre dans une room, deposes ta mise et verrouilles ta place."],
            ["2. Commit", "Choisis une zone, un risk band, ton forecast et genere un nonce local."],
            ["3. Reveal", "Revele le payload exact plus tard. Le programme prouve que tu n’as rien change."]
          ].map(([title, text]) => (
            <div key={title} className="fault-card rounded-3xl p-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-fault-flare">{title}</p>
              <p className="mt-3 text-sm leading-7 text-white/72">{text}</p>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
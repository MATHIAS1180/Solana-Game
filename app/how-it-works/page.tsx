import type { Metadata } from "next";
import Script from "next/script";

import { ProgramBanner } from "@/components/game/program-banner";

export const metadata: Metadata = {
  title: "How Faultline Works",
  description: "Learn how Faultline Arena works: zones, risk bands, forecasts, commit-reveal, scoring, and payouts explained clearly.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Faultline Works - Faultline Arena",
    description: "Learn how Faultline Arena works: zones, risk bands, forecasts, commit-reveal, scoring, and payouts explained clearly.",
    url: "/how-it-works"
  },
  twitter: {
    card: "summary_large_image",
    title: "How Faultline Works - Faultline Arena",
    description: "Learn how Faultline Arena works: zones, risk bands, forecasts, commit-reveal, scoring, and payouts explained clearly."
  }
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Faultline Arena random?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Faultline Arena is deterministic. Results come from player reveals, forecast error, and risk-band rules only."
      }
    },
    {
      "@type": "Question",
      name: "What is commit-reveal here?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You seal your decision first with a cryptographic hash, then reveal the exact payload later so nobody can copy your read mid-round."
      }
    },
    {
      "@type": "Question",
      name: "Why does forecast accuracy matter?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your score starts from how close your predicted five-zone distribution is to the real final histogram. Better modeling creates better scores."
      }
    }
  ]
};

const sections = [
  {
    id: "premise",
    title: "You are not betting on a number. You are betting on how humans think.",
    body: [
      "Faultline Arena is a crowd-reading game. You are trying to understand where other players will cluster across five zones before they reveal their choices.",
      "The core edge is not luck. It is the ability to read congestion, pick the right lane, and choose the right amount of risk for that read."
    ]
  },
  {
    id: "zones",
    title: "The five zones",
    body: [
      "Each round resolves into a real histogram across Zones A to E. The least crowded lanes create the best positional opportunities.",
      "The challenge is not just picking a zone. It is predicting where the room thinks value will be."
    ]
  },
  {
    id: "risk",
    title: "The three risk bands",
    body: [
      "Calm pays stability. Edge rewards landing inside the two least-crowded zones. Knife only pays if you chose the single least-crowded zone.",
      "Your band choice expresses personality as much as EV: stable, tactical, or all-in conviction."
    ]
  },
  {
    id: "forecast",
    title: "The forecast",
    body: [
      "Your forecast is a five-value vector describing how many players you think will end up in each zone at resolution.",
      "The closer your vector is to reality, the better your base score before the risk multiplier is applied."
    ]
  },
  {
    id: "commit-reveal",
    title: "Commit-reveal without jargon",
    body: [
      "You seal your decision first so nobody can see or copy it. Later, you reveal the exact payload and the protocol verifies it matches the original seal.",
      "Your clear payload is stored locally, so keeping the same device or an exported recovery file matters."
    ]
  },
  {
    id: "scoring",
    title: "Scoring and payout",
    body: [
      "The protocol computes a final histogram, measures your forecast error, applies the risk-band multiplier, then ranks the room deterministically.",
      "That is why every loss stays explainable: wrong zone, wrong risk, wrong room model, or a very small near miss."
    ]
  }
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <Script id="faultline-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <ProgramBanner />

      <section className="fault-card arena-stage-shell relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">How It Works</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl">Learn the room model before you lock your read.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          Faultline is a deterministic Solana PvP strategy game built around crowd prediction. No RNG. No oracle. Only human decisions revealed under pressure.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.28fr_0.72fr]">
        <aside className="fault-card h-fit rounded-[1.75rem] p-5 lg:sticky lg:top-28">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Sections</p>
          <nav className="mt-4 flex flex-col gap-2 text-sm text-white/72">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 transition hover:border-white/16 hover:text-white">
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="fault-card rounded-[1.75rem] p-6 sm:p-8 scroll-mt-28">
              <h2 className="font-display text-3xl text-white">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-white/70 sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="fault-card rounded-[1.75rem] p-6 sm:p-8">
            <p className="arena-kicker">FAQ</p>
            <div className="mt-6 space-y-3">
              {faqLd.mainEntity.map((entry) => (
                <div key={entry.name} className="arena-surface rounded-2xl p-4">
                  <h3 className="font-display text-xl text-white">{entry.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/68 sm:text-base">{entry.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

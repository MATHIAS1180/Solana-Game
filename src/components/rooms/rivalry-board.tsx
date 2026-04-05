import { shortKey, formatLamports } from "@/lib/utils";
import type { LiveRivalryEntry } from "@/lib/faultline/rivalry";

function formatLead(entry: LiveRivalryEntry) {
  if (entry.wins > 0 && entry.payoutLamports > 0n) {
    return `${entry.wins} paid finish${entry.wins === 1 ? "" : "es"}`;
  }

  if (entry.revealedSeats > 0) {
    return `${entry.revealedSeats} revealed read${entry.revealedSeats === 1 ? "" : "s"}`;
  }

  if (entry.committedSeats > 0) {
    return `${entry.committedSeats} locked commit${entry.committedSeats === 1 ? "" : "s"}`;
  }

  return `${entry.activeSeats} live seat${entry.activeSeats === 1 ? "" : "s"}`;
}

function formatDetail(entry: LiveRivalryEntry) {
  const fragments: string[] = [];

  if (entry.livePressureLamports > 0n) {
    fragments.push(`${formatLamports(entry.livePressureLamports)} live pressure`);
  }

  if (entry.hottestStakeLamports > 0n) {
    fragments.push(`top lane ${formatLamports(entry.hottestStakeLamports)}`);
  }

  if (entry.averageError !== null) {
    fragments.push(`avg error ${entry.averageError.toFixed(1)}`);
  }

  if (entry.lanes > 1) {
    fragments.push(`${entry.lanes} visible lanes touched`);
  }

  return fragments.join(" / ");
}

export function RivalryBoard({
  entries,
  eyebrow,
  title,
  summary,
  ctaHref,
  ctaLabel
}: {
  entries: LiveRivalryEntry[];
  eyebrow: string;
  title: string;
  summary: string;
  ctaHref?: `/${string}`;
  ctaLabel?: string;
}) {
  return (
    <section className="fault-card rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="arena-kicker">{eyebrow}</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl text-white sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">{summary}</p>
        </div>
        {ctaHref && ctaLabel ? (
          <a href={ctaHref} className="arena-secondary inline-flex items-center justify-center px-5 py-3 text-xs uppercase tracking-[0.2em]">
            {ctaLabel}
          </a>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3">
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <div key={entry.wallet} className="arena-stat rounded-[1.45rem] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/25 font-mono text-sm text-white/76">#{index + 1}</div>
                  <div>
                    <p className="font-display text-xl text-white">{shortKey(entry.wallet, 5)}</p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-fault-flare">{formatLead(entry)}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg text-white">{entry.livePressureLamports > 0n ? formatLamports(entry.livePressureLamports) : formatLamports(entry.payoutLamports)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">{entry.livePressureLamports > 0n ? "live pressure" : "paid out"}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/66">{formatDetail(entry)}</p>
            </div>
          ))
        ) : (
          <div className="arena-stat rounded-[1.45rem] p-5 text-sm leading-7 text-white/65">
            The public board is still too quiet to rank the regulars. As soon as seats fill and reveals land, this panel will surface the wallets setting the pace.
          </div>
        )}
      </div>
    </section>
  );
}

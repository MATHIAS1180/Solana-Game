import type { Forecast } from "@/lib/faultline/types";

import { HistogramBar } from "@/components/ui/histogram-bar";

export function ForecastInput({
  forecast,
  labels,
  maxValue,
  total,
  highlightedIndex,
  presets,
  onPreset,
  onChange
}: {
  forecast: Forecast;
  labels: readonly string[];
  maxValue: number;
  total: number;
  highlightedIndex: number;
  presets: ReadonlyArray<{ label: string; detail: string; forecast: Forecast }>;
  onPreset: (forecast: Forecast) => void;
  onChange: (forecast: Forecast) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onPreset([...preset.forecast] as Forecast)}
            className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left text-white/74 transition hover:border-white/24 hover:bg-white/[0.04] hover:text-white"
          >
            <p className="font-display text-base text-white">{preset.label}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/45">{preset.detail}</p>
            <p className="mt-2 font-mono text-xs text-white/62">[{preset.forecast.join(", ")}]</p>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-2 sm:grid-cols-5 lg:grid-cols-1">
          {forecast.map((value, index) => (
            <label key={labels[index]} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white/78">
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">{labels[index]}</span>
              <input
                type="number"
                min={0}
                max={maxValue}
                value={value}
                onChange={(event) => {
                  const next = [...forecast] as Forecast;
                  next[index] = Number(event.target.value);
                  onChange(next);
                }}
                className="mt-2 w-full bg-transparent text-xl text-white outline-none"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-2">
          {forecast.map((value, index) => (
            <HistogramBar
              key={`${labels[index]}-forecast`}
              label={labels[index]}
              value={value}
              total={total}
              highlighted={highlightedIndex === index}
              tone={highlightedIndex === index ? "flare" : "signal"}
              footer={highlightedIndex === index ? "Selected zone emphasis" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
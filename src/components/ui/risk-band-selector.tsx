import { cn } from "@/lib/utils";

type RiskOption = {
  label: string;
  note: string;
};

export function RiskBandSelector({
  value,
  options,
  onChange
}: {
  value: number;
  options: RiskOption[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {options.map((option, index) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(index)}
          className={cn(
            "rounded-[1.5rem] border p-4 text-left transition",
            value === index
              ? "border-fault-flare bg-fault-flare/10 text-white shadow-[0_0_0_1px_rgba(255,209,102,0.08)]"
              : "border-white/10 bg-black/20 text-white/72 hover:border-white/24 hover:bg-white/[0.03]"
          )}
          aria-pressed={value === index}
        >
          <p className="font-display text-lg text-white">{option.label}</p>
          <p className={cn("mt-2 text-xs uppercase tracking-[0.2em]", value === index ? "text-fault-flare" : "text-white/42")}>Risk band</p>
          <p className="mt-3 text-sm leading-6 text-white/62">{option.note}</p>
        </button>
      ))}
    </div>
  );
}
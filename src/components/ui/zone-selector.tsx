import { cn } from "@/lib/utils";

type ZoneOption = {
  label: string;
  note?: string;
};

export function ZoneSelector({
  value,
  options,
  onChange
}: {
  value: number;
  options: ZoneOption[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {options.map((option, index) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(index)}
          className={cn(
            "rounded-[1.35rem] border p-4 text-left transition",
            value === index
              ? "border-fault-ember bg-fault-ember text-fault-basalt shadow-[0_0_0_1px_rgba(255,209,102,0.12)]"
              : "border-white/10 bg-black/20 text-white/74 hover:border-white/24 hover:bg-white/[0.04]"
          )}
          aria-pressed={value === index}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-lg">{option.label}</span>
            <span className={cn("text-xs uppercase tracking-[0.2em]", value === index ? "text-fault-basalt/70" : "text-white/42")}>Zone</span>
          </div>
          {option.note ? <p className={cn("mt-2 text-xs leading-5", value === index ? "text-fault-basalt/72" : "text-white/54")}>{option.note}</p> : null}
        </button>
      ))}
    </div>
  );
}
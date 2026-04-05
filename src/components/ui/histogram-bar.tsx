import { cn } from "@/lib/utils";

export function HistogramBar({
  label,
  value,
  total,
  highlighted = false,
  tone = "signal",
  className,
  footer
}: {
  label: string;
  value: number;
  total: number;
  highlighted?: boolean;
  tone?: "signal" | "flare" | "ember";
  className?: string;
  footer?: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-black/20 p-3", highlighted && "border-white/18 bg-white/[0.04]", className)}>
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/48">
        <span>{label}</span>
        <span>{percent.toFixed(0)}%</span>
      </div>
      <p className="mt-2 text-lg text-white">{value}</p>
      <div className="arena-meter mt-3 h-2">
        <span
          className={cn(
            tone === "flare" && "!bg-[linear-gradient(90deg,rgba(var(--arena-flare),0.95),rgba(var(--arena-ember),0.92),rgba(255,255,255,0.35))]",
            tone === "ember" && "!bg-[linear-gradient(90deg,rgba(var(--arena-ember),0.95),rgba(var(--arena-flare),0.82),rgba(255,255,255,0.22))]"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {footer ? <p className="mt-2 text-xs leading-5 text-white/56">{footer}</p> : null}
    </div>
  );
}
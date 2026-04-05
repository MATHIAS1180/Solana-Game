import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  subtext,
  trend = "neutral",
  className
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("arena-stat rounded-[1.4rem] p-4", className)}>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p
        className={cn(
          "mt-3 font-display text-2xl text-white",
          trend === "up" && "text-emerald-200",
          trend === "down" && "text-fault-flare"
        )}
      >
        {value}
      </p>
      {subtext ? <p className="mt-2 text-sm leading-6 text-white/62">{subtext}</p> : null}
    </div>
  );
}

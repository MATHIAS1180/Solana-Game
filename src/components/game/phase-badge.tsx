import { ROOM_STATUS_LABELS } from "@/lib/faultline/constants";
import { cn } from "@/lib/utils";

export function PhaseBadge({ status }: { status: number }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
        status === 3 && "bg-emerald-400/15 text-emerald-200",
        status === 2 && "bg-amber-300/15 text-amber-100",
        status === 1 && "bg-orange-400/15 text-orange-100",
        status === 0 && "bg-white/10 text-white/75",
        status >= 4 && "bg-white/8 text-white/60"
      )}
    >
      {ROOM_STATUS_LABELS[status] || "Unknown"}
    </span>
  );
}
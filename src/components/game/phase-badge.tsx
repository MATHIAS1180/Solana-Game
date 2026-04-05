import { Activity, Eye, ShieldAlert, Trophy, Users } from "lucide-react";

import { ROOM_STATUS, ROOM_STATUS_LABELS } from "@/lib/faultline/constants";
import { cn } from "@/lib/utils";

function getPhaseIcon(status: number) {
  if (status === ROOM_STATUS.Open) {
    return Users;
  }
  if (status === ROOM_STATUS.Commit) {
    return Activity;
  }
  if (status === ROOM_STATUS.Reveal) {
    return Eye;
  }
  if (status === ROOM_STATUS.Resolved) {
    return Trophy;
  }
  return ShieldAlert;
}

export function PhaseBadge({
  status,
  detail,
  compact = false
}: {
  status: number;
  detail?: string;
  compact?: boolean;
}) {
  const Icon = getPhaseIcon(status);

  return (
    <span
      data-status={ROOM_STATUS_LABELS[status] || "Unknown"}
      className={cn(
        "arena-phase-badge inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]",
        status === ROOM_STATUS.Resolved && "bg-emerald-400/15 text-emerald-200",
        status === ROOM_STATUS.Reveal && "bg-amber-300/15 text-amber-100",
        status === ROOM_STATUS.Commit && "bg-orange-400/15 text-orange-100",
        status === ROOM_STATUS.Open && "bg-white/10 text-white/75",
        status >= ROOM_STATUS.Cancelled && "bg-white/8 text-white/60"
      )}
    >
      <Icon className="size-3.5" />
      <span>{ROOM_STATUS_LABELS[status] || "Unknown"}</span>
      {!compact && detail ? <span className="hidden text-[10px] text-current/70 sm:inline">{detail}</span> : null}
    </span>
  );
}
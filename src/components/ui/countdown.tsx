import { cn, formatCountdown } from "@/lib/utils";

function getUrgency(remaining: number, urgencyAt: number) {
  if (remaining <= 0) {
    return "expired" as const;
  }

  if (remaining <= Math.max(10, Math.floor(urgencyAt / 3))) {
    return "urgent" as const;
  }

  if (remaining <= urgencyAt) {
    return "warning" as const;
  }

  return "normal" as const;
}

export function Countdown({
  targetSlot,
  currentSlot,
  urgencyAt = 75,
  className
}: {
  targetSlot: number;
  currentSlot: number;
  urgencyAt?: number;
  className?: string;
}) {
  const remaining = targetSlot - currentSlot;
  const urgency = getUrgency(remaining, urgencyAt);
  const label = remaining <= 0 ? "Expired" : formatCountdown(remaining);

  return (
    <span
      className={cn(
        "font-mono",
        urgency === "warning" && "arena-hot-text",
        urgency === "urgent" && "arena-urgent-text",
        className
      )}
      aria-live="polite"
    >
      {label}
    </span>
  );
}

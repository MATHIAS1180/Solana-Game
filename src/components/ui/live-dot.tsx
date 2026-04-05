import { cn } from "@/lib/utils";

export function LiveDot({
  size = "md",
  className
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return <span className={cn("arena-live-dot", size === "sm" && "size-2", className)} aria-hidden="true" />;
}

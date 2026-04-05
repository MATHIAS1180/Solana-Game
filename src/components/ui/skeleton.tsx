import { cn } from "@/lib/utils";

export function Skeleton({
  variant = "block",
  className
}: {
  variant?: "text" | "title" | "card" | "block";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "skeleton",
        variant === "text" && "skeleton-text",
        variant === "title" && "skeleton-title",
        variant === "block" && "skeleton-block",
        variant === "card" && "skeleton-card",
        className
      )}
      aria-hidden="true"
    />
  );
}

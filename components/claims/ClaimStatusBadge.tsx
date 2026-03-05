import { cn } from "@/lib/utils";
import { CLAIM_STATUSES } from "@/lib/constants";

interface ClaimStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function ClaimStatusBadge({ status, size = "md" }: ClaimStatusBadgeProps) {
  const statusInfo = CLAIM_STATUSES.find((s) => s.value === status);
  const color = statusInfo?.color ?? "bg-gray-100 text-gray-800";
  const label = statusInfo?.label ?? status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full whitespace-nowrap",
        color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      {label}
    </span>
  );
}

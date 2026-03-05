import { cn } from "@/lib/utils";
import { PROPOSAL_STATUSES } from "@/lib/constants";

export function ProposalStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const info = PROPOSAL_STATUSES.find((s) => s.value === status);
  return (
    <span className={cn("inline-flex items-center font-medium rounded-full whitespace-nowrap", info?.color ?? "bg-gray-100 text-gray-800", size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs")}>
      {info?.label ?? status.replace(/_/g, " ")}
    </span>
  );
}

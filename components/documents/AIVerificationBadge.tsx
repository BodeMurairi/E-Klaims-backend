import { CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIVerificationBadgeProps {
  verified: boolean;
  flagged: boolean;
  flagReason?: string;
}

export function AIVerificationBadge({ verified, flagged, flagReason }: AIVerificationBadgeProps) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
        <CheckCircle size={11} />
        AI Verified
      </span>
    );
  }

  if (flagged) {
    return (
      <span
        title={flagReason}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium cursor-help"
      >
        <AlertTriangle size={11} />
        Flagged
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-medium">
      <Clock size={11} />
      Pending
    </span>
  );
}

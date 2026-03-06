"use client";

import { formatDateTime } from "@/lib/utils";
import { CLAIM_STATUSES } from "@/lib/constants";
import { Id } from "@/convex/_generated/dataModel";
import { CheckCircle, Circle } from "lucide-react";

interface StatusEntry {
  status: string;
  timestamp: number;
  userId: Id<"users">;
  notes?: string;
}

interface ClaimStatusTimelineProps {
  statusHistory: StatusEntry[];
  currentStatus: string;
}

const ALL_STATUSES: string[] = CLAIM_STATUSES.map((s) => s.value);

export function ClaimStatusTimeline({ statusHistory, currentStatus }: ClaimStatusTimelineProps) {
  const isRejected = currentStatus === "rejected";
  const isPaid = currentStatus === "paid";

  return (
    <div className="space-y-0">
      {statusHistory.map((entry, idx) => {
        const statusInfo = CLAIM_STATUSES.find((s) => s.value === entry.status);
        const isLast = idx === statusHistory.length - 1;

        return (
          <div key={idx} className="flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  entry.status === "rejected"
                    ? "bg-red-100"
                    : "bg-green-100"
                }`}
              >
                <CheckCircle
                  size={16}
                  className={
                    entry.status === "rejected" ? "text-red-500" : "text-green-500"
                  }
                />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[24px]" />}
            </div>

            {/* Content */}
            <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-gray-900">
                  {statusInfo?.label ?? entry.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(entry.timestamp)}
                </span>
              </div>
              {entry.notes && (
                <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Show upcoming steps if not terminal */}
      {!isRejected && !isPaid && (
        <>
          {ALL_STATUSES.slice(
            ALL_STATUSES.findIndex((s) => s === currentStatus) + 1
          ).map((futureStatus) => {
            const statusInfo = CLAIM_STATUSES.find((s) => s.value === futureStatus);
            if (futureStatus === "rejected") return null;
            return (
              <div key={futureStatus} className="flex gap-4 opacity-40">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                    <Circle size={12} className="text-gray-300" />
                  </div>
                  {futureStatus !== "paid" && (
                    <div className="w-0.5 flex-1 bg-gray-100 my-1 min-h-[24px]" />
                  )}
                </div>
                <div className="pb-6">
                  <span className="text-sm text-gray-400">
                    {statusInfo?.label ?? futureStatus.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

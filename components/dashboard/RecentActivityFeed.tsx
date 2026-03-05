"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatRelativeTime } from "@/lib/utils";
import { Activity } from "lucide-react";

export function RecentActivityFeed() {
  const logs = useQuery(api.auditLogs.listRecent, { limit: 10 });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <Activity size={16} className="text-gray-500" />
        <h3 className="font-semibold text-gray-800 text-sm">Recent Activity</h3>
      </div>
      <div className="divide-y">
        {!logs || logs.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No recent activity
          </div>
        ) : (
          logs.map((log) => (
            <div key={log._id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-800">{log.action.replace(/\./g, " ").replace(/_/g, " ")}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatRelativeTime(log.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

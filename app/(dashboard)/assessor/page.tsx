"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { ClipboardCheck, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function AssessorDashboard() {
  const { convexUser } = useCurrentUser();
  const assignments = useQuery(api.claims.listByAssessor, convexUser ? { assessorId: convexUser._id } : "skip");

  const pending = assignments?.filter(c => c.status === "assessor_assigned") ?? [];
  const completed = assignments?.filter(c => c.status === "assessment_completed" || c.status === "approved" || c.status === "paid") ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Assessor Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Assignments" value={assignments?.length ?? 0} icon={ClipboardCheck} iconColor="text-blue-600" />
        <StatsCard title="Pending Assessment" value={pending.length} icon={Clock} iconColor="text-yellow-600" />
        <StatsCard title="Completed" value={completed.length} icon={CheckCircle} iconColor="text-green-600" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-800">My Assignments</h3>
          <Link href="/assessor/assignments" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="divide-y">
          {!assignments ? <div className="p-8 text-center text-gray-400">Loading...</div> :
            assignments.length === 0 ? <div className="p-8 text-center text-gray-400">No assignments yet</div> :
              assignments.slice(0, 5).map(c => (
                <Link key={c._id} href={`/assessor/assignments/${c._id}`} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{c.claimId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.location} · {formatRelativeTime(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{formatCurrency(c.estimatedLoss)}</span>
                    <ClaimStatusBadge status={c.status} size="sm" />
                  </div>
                </Link>
              ))
          }
        </div>
      </div>
    </div>
  );
}

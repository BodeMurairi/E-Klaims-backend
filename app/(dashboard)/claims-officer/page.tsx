"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { formatDate, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ClaimsOfficerDashboard() {
  const all = useQuery(api.claims.listAll);

  const submitted = all?.filter(c => c.status === "submitted") ?? [];
  const underReview = all?.filter(c => c.status === "under_review") ?? [];
  const approved = all?.filter(c => c.status === "approved" || c.status === "paid") ?? [];
  const docsPending = all?.filter(c => c.status === "documents_pending") ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Claims Officer Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="New Claims" value={submitted.length} icon={FileText} iconColor="text-blue-600" />
        <StatsCard title="Under Review" value={underReview.length} icon={Clock} iconColor="text-purple-600" />
        <StatsCard title="Docs Pending" value={docsPending.length} icon={AlertTriangle} iconColor="text-yellow-600" />
        <StatsCard title="Approved/Paid" value={approved.length} icon={CheckCircle} iconColor="text-green-600" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-800">All Claims</h3>
          <Link href="/claims-officer/claims" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{["Claim ID", "Description", "Est. Loss", "Submitted", "Status", "Action"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {!all ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> :
                all.slice(0, 8).map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.claimId}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.description}</td>
                    <td className="px-4 py-3">{formatCurrency(c.estimatedLoss)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatRelativeTime(c.createdAt)}</td>
                    <td className="px-4 py-3"><ClaimStatusBadge status={c.status} size="sm" /></td>
                    <td className="px-4 py-3"><Link href={`/claims-officer/claims/${c._id}`} className="text-xs text-blue-600 hover:underline">Manage →</Link></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

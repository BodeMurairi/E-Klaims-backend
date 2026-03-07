"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { useState } from "react";
import { CLAIM_STATUSES } from "@/lib/constants";
import Link from "next/link";

export default function ClaimsOfficerClaimsPage() {
  const [filter, setFilter] = useState("all");
  const all = useQuery(api.claims.listAll);
  const filtered = all?.filter(c => filter === "all" || c.status === filter) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">All Claims</h2>
      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "All", color: "" }, ...CLAIM_STATUSES].map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s.value ? "bg-brand-500 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Claim ID", "Description", "Est. Loss", "Submitted", "Status", ""].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {!all ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No claims</td></tr> :
                filtered.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.claimId}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.description}</td>
                    <td className="px-4 py-3">{formatCurrency(c.estimatedLoss)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatRelativeTime(c.createdAt)}</td>
                    <td className="px-4 py-3"><ClaimStatusBadge status={c.status} size="sm" /></td>
                    <td className="px-4 py-3"><Link href={`/claims-officer/claims/${c._id}`} className="text-xs text-blue-600 hover:underline">Manage →</Link></td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

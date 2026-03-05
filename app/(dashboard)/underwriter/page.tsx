"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

export default function UnderwriterDashboard() {
  const pending = useQuery(api.proposals.listPending);
  const all = useQuery(api.proposals.listAll);

  const approved = all?.filter(p => p.status === "approved") ?? [];
  const rejected = all?.filter(p => p.status === "rejected") ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Underwriter Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Pending Review" value={pending?.length ?? 0} icon={Clock} iconColor="text-yellow-600" />
        <StatsCard title="Under Review" value={all?.filter(p => p.status === "under_review").length ?? 0} icon={FileText} iconColor="text-blue-600" />
        <StatsCard title="Approved" value={approved.length} icon={CheckCircle} iconColor="text-green-600" />
        <StatsCard title="Rejected" value={rejected.length} icon={XCircle} iconColor="text-red-600" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-800">Proposals Awaiting Review</h3>
          <Link href="/underwriter/proposals" className="text-xs text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {!pending ? <div className="text-gray-400 text-sm col-span-2">Loading...</div> :
            pending.length === 0 ? <p className="text-sm text-gray-400 col-span-2 py-6 text-center">No pending proposals</p> :
              pending.slice(0, 4).map(p => (
                <ProposalCard key={p._id} proposal={p} href={`/underwriter/proposals/${p._id}`} />
              ))
          }
        </div>
      </div>
    </div>
  );
}

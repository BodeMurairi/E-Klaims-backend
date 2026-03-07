"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PROPOSAL_STATUSES } from "@/lib/constants";

export default function DistributorProposalsPage() {
  const { convexUser } = useCurrentUser();
  const [filter, setFilter] = useState("all");
  const proposals = useQuery(api.proposals.listByDistributor, convexUser ? { distributorId: convexUser._id } : "skip");

  const filtered = proposals?.filter(p => filter === "all" || p.status === filter) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Proposals</h2>
        <Link href="/distributor/proposals/new" className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> New Proposal
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "All" }, ...PROPOSAL_STATUSES].map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s.value ? "bg-brand-500 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {!proposals ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">No proposals found</div>
          ) : (
            filtered.map(p => <ProposalCard key={p._id} proposal={p} href={`/distributor/proposals/${p._id}`} />)
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { useState } from "react";
import { PROPOSAL_STATUSES } from "@/lib/constants";

export default function UnderwriterProposalsPage() {
  const [filter, setFilter] = useState("all");
  const proposals = useQuery(api.proposals.listAll);
  const filtered = proposals?.filter(p => filter === "all" || p.status === filter) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">All Proposals</h2>
      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "All" }, ...PROPOSAL_STATUSES].map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s.value ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {!proposals ? <div className="text-gray-400">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? <div className="col-span-3 text-center py-12 text-gray-400">No proposals found</div> :
            filtered.map(p => <ProposalCard key={p._id} proposal={p} href={`/underwriter/proposals/${p._id}`} />)
          }
        </div>
      )}
    </div>
  );
}

"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { FileText, Users, CheckCircle, Clock, Plus } from "lucide-react";
import Link from "next/link";

export default function DistributorDashboard() {
  const { convexUser } = useCurrentUser();
  const proposals = useQuery(api.proposals.listByDistributor, convexUser ? { distributorId: convexUser._id } : "skip");
  const clients = useQuery(api.users.listByRole, { role: "client" });

  const pending = proposals?.filter(p => p.status === "pending") ?? [];
  const approved = proposals?.filter(p => p.status === "approved") ?? [];
  const recent = proposals?.slice(0, 4) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {convexUser?.name.split(" ")[0]}</p>
        </div>
        <Link href="/distributor/proposals/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> New Proposal
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Proposals" value={proposals?.length ?? 0} icon={FileText} iconColor="text-blue-600" />
        <StatsCard title="Pending Review" value={pending.length} icon={Clock} iconColor="text-yellow-600" />
        <StatsCard title="Approved" value={approved.length} icon={CheckCircle} iconColor="text-green-600" />
        <StatsCard title="Clients" value={clients?.length ?? 0} icon={Users} iconColor="text-purple-600" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Recent Proposals</h3>
          <Link href="/distributor/proposals" className="text-xs text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 col-span-2 py-6 text-center">No proposals yet</p>
          ) : (
            recent.map(p => <ProposalCard key={p._id} proposal={p} href={`/distributor/proposals/${p._id}`} />)
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { FileText, Users, CheckCircle, Clock, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

export default function DistributorDashboard() {
  const { convexUser } = useCurrentUser();
  const proposals = useQuery(api.proposals.listByDistributor, convexUser ? { distributorId: convexUser._id } : "skip");

  const pending = proposals?.filter(p => p.status === "pending" && !p.pendingClientConfirmation) ?? [];
  const approved = proposals?.filter(p => p.status === "approved") ?? [];
  const pendingConfirmation = proposals?.filter(p => p.pendingClientConfirmation) ?? [];
  const recent = proposals?.filter(p => !p.pendingClientConfirmation).slice(0, 4) ?? [];

  // All confirmed clients: proposals linked to this agent (as distributor) that are not still awaiting client confirmation.
  // This covers both: clients who self-applied and linked this agent, and clients onboarded directly by this agent.
  const confirmedProposals = proposals?.filter(p => !p.pendingClientConfirmation) ?? [];
  const uniqueClientIds = [...new Set(confirmedProposals.map(p => p.clientId))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {convexUser?.name.split(" ")[0]}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/distributor/onboard"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <UserPlus size={16} /> Onboard a Client
          </Link>
          <Link
            href="/distributor/proposals/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> New Proposal
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Proposals" value={proposals?.filter(p => !p.pendingClientConfirmation).length ?? 0} icon={FileText} iconColor="text-blue-600" />
        <StatsCard title="Pending Review" value={pending.length} icon={Clock} iconColor="text-yellow-600" />
        <StatsCard title="Approved" value={approved.length} icon={CheckCircle} iconColor="text-green-600" />
        <StatsCard title="My Clients" value={uniqueClientIds.length} icon={Users} iconColor="text-purple-600" />
      </div>

      {/* Pending client confirmations banner */}
      {pendingConfirmation.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              {pendingConfirmation.length} application{pendingConfirmation.length !== 1 ? "s" : ""} awaiting client confirmation
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              These applications will be submitted for review once the client confirms.
            </p>
          </div>
          <span className="text-xs font-medium bg-amber-100 text-amber-800 px-3 py-1 rounded-full whitespace-nowrap">
            Pending Approval
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Proposals */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Recent Proposals</h3>
            <Link href="/distributor/proposals" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="p-4 grid grid-cols-1 gap-3">
            {recent.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No proposals yet</p>
            ) : (
              recent.map(p => <ProposalCard key={p._id} proposal={p} href={`/distributor/proposals/${p._id}`} />)
            )}
          </div>
        </div>

        {/* My Clients */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">My Clients</h3>
            <span className="text-xs text-gray-400">{uniqueClientIds.length} client{uniqueClientIds.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y">
            {uniqueClientIds.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No clients onboarded yet</p>
                <Link
                  href="/distributor/onboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  <UserPlus size={14} /> Onboard a Client
                </Link>
              </div>
            ) : (
              confirmedProposals
                .filter((p, i, all) => all.findIndex(x => x.clientId === p.clientId) === i)
                .map((proposal) => {
                  const clientProposals = confirmedProposals.filter(p => p.clientId === proposal.clientId);
                  return (
                    <div key={proposal.clientId} className="px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">Client ID: {proposal.clientId.slice(-8)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {clientProposals.length} application{clientProposals.length !== 1 ? "s" : ""} · Last: {formatRelativeTime(Math.max(...clientProposals.map(p => p.createdAt)))}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {clientProposals.some(p => p.pendingClientConfirmation) && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending confirmation</span>
                          )}
                          {clientProposals.some(p => p.status === "approved") && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Approved</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

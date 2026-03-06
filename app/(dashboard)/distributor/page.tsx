"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, CheckCircle, Clock, UserPlus, Shield, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

function ClientRow({ clientId, proposals }: {
  clientId: Id<"users">;
  proposals: { status: string; pendingClientConfirmation?: boolean; createdAt: number }[];
}) {
  const client = useQuery(api.users.getById, { id: clientId });

  const latestAt = Math.max(...proposals.map((p) => p.createdAt));
  const hasApproved = proposals.some((p) => p.status === "approved");
  const hasPending = proposals.some((p) => p.pendingClientConfirmation);

  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-gray-800 text-sm truncate">
          {client ? client.name : "Loading…"}
        </p>
        {client && (
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {client.email && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Mail size={11} /> {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Phone size={11} /> {client.phone}
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {proposals.length} application{proposals.length !== 1 ? "s" : ""} · Last: {formatRelativeTime(latestAt)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {hasPending && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Awaiting confirmation</span>
        )}
        {hasApproved && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Policy active</span>
        )}
      </div>
    </div>
  );
}

export default function DistributorDashboard() {
  const { convexUser } = useCurrentUser();
  const proposals = useQuery(
    api.proposals.listByDistributor,
    convexUser ? { distributorId: convexUser._id } : "skip"
  );

  const confirmedProposals = proposals?.filter((p) => !p.pendingClientConfirmation) ?? [];
  const pending = proposals?.filter((p) => p.status === "pending" && !p.pendingClientConfirmation) ?? [];
  const approved = proposals?.filter((p) => p.status === "approved") ?? [];
  const pendingConfirmation = proposals?.filter((p) => p.pendingClientConfirmation) ?? [];

  // Unique clients: both confirmed + awaiting confirmation
  const allProposals = proposals ?? [];
  const uniqueClientIds = [...new Set(allProposals.map((p) => p.clientId))] as Id<"users">[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {convexUser?.name.split(" ")[0]}</p>
        </div>
        <Link
          href="/distributor/onboard"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={16} /> Onboard a Client
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="My Clients" value={uniqueClientIds.length} icon={Users} iconColor="text-purple-600" />
        <StatsCard title="Active Policies" value={approved.length} icon={Shield} iconColor="text-green-600" />
        <StatsCard title="Pending Review" value={pending.length} icon={Clock} iconColor="text-yellow-600" />
        <StatsCard title="Approved" value={approved.length} icon={CheckCircle} iconColor="text-blue-600" />
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

      {/* My Clients */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">My Clients</h3>
          <Link href="/distributor/clients" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y">
          {uniqueClientIds.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-4">No clients yet</p>
              <Link
                href="/distributor/onboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                <UserPlus size={14} /> Onboard a Client
              </Link>
            </div>
          ) : (
            uniqueClientIds.slice(0, 5).map((clientId) => {
              const clientProposals = allProposals.filter((p) => p.clientId === clientId);
              return (
                <ClientRow
                  key={clientId}
                  clientId={clientId}
                  proposals={clientProposals}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ClaimStatusBadge } from "@/components/dashboard/ClaimStatusBadge";
import { formatDate, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Shield, FileText, Clock, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ClientDashboard() {
  const { convexUser } = useCurrentUser();
  const policies = useQuery(
    api.policies.listByClient,
    convexUser ? { clientId: convexUser._id } : "skip"
  );
  const claims = useQuery(
    api.claims.listByClient,
    convexUser ? { clientId: convexUser._id } : "skip"
  );
  const proposals = useQuery(
    api.proposals.listByClient,
    convexUser ? { clientId: convexUser._id } : "skip"
  );

  const activePolicies = policies?.filter((p) => p.status === "active") ?? [];
  const openClaims = claims?.filter((c) => !["paid", "rejected"].includes(c.status)) ?? [];
  const recentClaims = claims?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back{convexUser ? `, ${convexUser.name.split(" ")[0]}` : ""}!
          </h2>
          <p className="text-gray-500 text-sm mt-1">Here's an overview of your insurance activity</p>
        </div>
        <Link
          href="/client/claims/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          File a Claim
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Active Policies"
          value={activePolicies.length}
          subtitle="Currently covered"
          icon={Shield}
          iconColor="text-green-600"
        />
        <StatsCard
          title="Open Claims"
          value={openClaims.length}
          subtitle="In progress"
          icon={FileText}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Total Claims"
          value={claims?.length ?? 0}
          subtitle="All time"
          icon={Clock}
          iconColor="text-purple-600"
        />
      </div>

      {/* Application Tracker */}
      {proposals && proposals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">My Applications</h3>
            <span className="text-xs text-gray-400">{proposals.length} application{proposals.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y">
            {proposals.map((proposal) => {
              const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
                pending:        { label: "Submitted", color: "bg-blue-100 text-blue-700", step: 1 },
                under_review:   { label: "Under Review", color: "bg-yellow-100 text-yellow-700", step: 2 },
                more_documents: { label: "More Info Requested", color: "bg-orange-100 text-orange-700", step: 3 },
                approved:       { label: "Approved", color: "bg-green-100 text-green-700", step: 4 },
                rejected:       { label: "Declined", color: "bg-red-100 text-red-700", step: 5 },
              };
              const cfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.pending;
              const STEPS = ["Submitted", "Under Review", "More Info", "Approved / Declined"];
              return (
                <div key={proposal._id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm capitalize">{proposal.productType} Insurance</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(proposal.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  {/* Progress track */}
                  <div className="flex items-center gap-1">
                    {STEPS.map((s, i) => {
                      const active = i < Math.min(cfg.step, STEPS.length);
                      return (
                        <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-blue-600" : "bg-gray-200"}`} />
                          {i < STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 ${i < cfg.step - 1 ? "bg-blue-600" : "bg-gray-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    {STEPS.map((s, i) => (
                      <span key={s} className={`text-xs ${i === Math.min(cfg.step - 1, STEPS.length - 1) ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                  {proposal.underwriterNotes && (
                    <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">
                      "{proposal.underwriterNotes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Policies */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Active Policies</h3>
            <Link href="/client/policies" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {activePolicies.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No active policies</div>
            ) : (
              activePolicies.map((policy) => (
                <div key={policy._id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{policy.policyNumber}</p>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">{policy.productType} Insurance</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Active
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>Covered: {formatCurrency(policy.sumInsured)}</span>
                    <span>Expires: {formatDate(policy.endDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Recent Claims</h3>
            <Link href="/client/claims" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentClaims.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No claims yet</div>
            ) : (
              recentClaims.map((claim) => (
                <Link
                  key={claim._id}
                  href={`/client/claims/${claim._id}`}
                  className="block px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{claim.claimId}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatRelativeTime(claim.createdAt)}
                      </p>
                    </div>
                    <ClaimStatusBadge status={claim.status} size="sm" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{claim.description}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

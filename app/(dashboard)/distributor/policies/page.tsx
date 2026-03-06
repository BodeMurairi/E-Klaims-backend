"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Shield, FileText, XCircle, Clock, AlertTriangle } from "lucide-react";
import { POLICY_STATUSES, PROPOSAL_STATUSES, PRODUCT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type FilterKey = "all" | "active" | "pending" | "more_documents" | "rejected";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending / Under Review" },
  { key: "more_documents", label: "More Documents" },
  { key: "rejected", label: "Rejected" },
];

function ClientName({ clientId }: { clientId: string }) {
  const client = useQuery(api.users.getById, { id: clientId as any });
  return <span className="text-xs text-gray-400">{client?.name ?? "—"}</span>;
}

export default function DistributorPoliciesPage() {
  const { convexUser } = useCurrentUser();
  const [filter, setFilter] = useState<FilterKey>("all");

  const policies = useQuery(
    api.policies.listByDistributor,
    convexUser ? { distributorId: convexUser._id } : "skip"
  );
  const proposals = useQuery(
    api.proposals.listByDistributor,
    convexUser ? { distributorId: convexUser._id } : "skip"
  );

  const isLoading = !policies || !proposals;

  // Proposals not yet converted to a policy
  const openProposals = (proposals ?? []).filter((p) => !p.convertedPolicyId);

  type PolicyItem =
    | { kind: "policy"; data: NonNullable<typeof policies>[number] }
    | { kind: "proposal"; data: (typeof openProposals)[number] };

  const allItems: PolicyItem[] = [
    ...(policies ?? []).map((p) => ({ kind: "policy" as const, data: p })),
    ...openProposals.map((p) => ({ kind: "proposal" as const, data: p })),
  ];

  const filtered = allItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "active") return item.kind === "policy" && item.data.status === "active";
    if (filter === "pending")
      return item.kind === "proposal" && ["pending", "under_review"].includes(item.data.status);
    if (filter === "more_documents")
      return item.kind === "proposal" && item.data.status === "more_documents";
    if (filter === "rejected")
      return item.kind === "proposal" && item.data.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Client Policies</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Shield size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">
            {filter === "all"
              ? "No policies yet for your clients."
              : `No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} items.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            if (item.kind === "policy") {
              const policy = item.data;
              const statusInfo = POLICY_STATUSES.find((s) => s.value === policy.status);
              const product = PRODUCT_TYPES.find((p) => p.value === policy.productType);
              return (
                <div key={policy._id} className="bg-white rounded-xl border p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{policy.policyNumber}</p>
                      <p className="text-sm text-gray-500">{product?.label ?? policy.productType}</p>
                      <ClientName clientId={policy.clientId} />
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusInfo?.color ?? "bg-gray-100 text-gray-800")}>
                      {statusInfo?.label ?? policy.status}
                    </span>
                  </div>
                  {policy.notes && <p className="text-sm text-gray-600 mt-2">{policy.notes}</p>}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Sum Insured</p>
                      <p className="font-semibold text-gray-800">{formatCurrency(policy.sumInsured)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Annual Premium</p>
                      <p className="font-semibold text-gray-800">{formatCurrency(policy.premium)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Start Date</p>
                      <p className="text-gray-700">{formatDate(policy.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Expiry Date</p>
                      <p className="text-gray-700">{formatDate(policy.endDate)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Link
                      href={`/distributor/policies/${policy._id}`}
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <FileText size={14} />
                      View Policy Document
                    </Link>
                  </div>
                </div>
              );
            }

            // Proposal card
            const proposal = item.data;
            const statusInfo = PROPOSAL_STATUSES.find((s) => s.value === proposal.status);
            const product = PRODUCT_TYPES.find((p) => p.value === proposal.productType);
            const isRejected = proposal.status === "rejected";
            const needsDocs = proposal.status === "more_documents";

            return (
              <div
                key={proposal._id}
                className={cn(
                  "bg-white rounded-xl border p-5 shadow-sm",
                  isRejected && "border-red-100 bg-red-50/30",
                  needsDocs && "border-orange-100 bg-orange-50/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isRejected && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                    {needsDocs && <AlertTriangle size={16} className="text-orange-400 flex-shrink-0" />}
                    {!isRejected && !needsDocs && <Clock size={16} className="text-gray-300 flex-shrink-0" />}
                    <div>
                      <p className="font-semibold text-gray-900">{product?.label ?? proposal.productType}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Application · {formatDate(proposal.createdAt)}</p>
                      <ClientName clientId={proposal.clientId} />
                    </div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusInfo?.color ?? "bg-gray-100 text-gray-800")}>
                    {statusInfo?.label ?? proposal.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Sum Insured</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(proposal.sumInsured)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Last Updated</p>
                    <p className="text-gray-700">{formatDate(proposal.updatedAt)}</p>
                  </div>
                </div>

                {needsDocs && proposal.underwriterNotes && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                    <p className="text-xs font-medium text-orange-700 mb-0.5">Documents Requested</p>
                    <p className="text-sm text-orange-900 whitespace-pre-line">{proposal.underwriterNotes}</p>
                  </div>
                )}

                {isRejected && proposal.rejectionReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs font-medium text-red-600 mb-0.5">Reason for Decline</p>
                    <p className="text-sm text-red-800">{proposal.rejectionReason}</p>
                  </div>
                )}

                {isRejected && proposal.underwriterNotes && (
                  <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Underwriter Notes</p>
                    <p className="text-sm text-gray-700">{proposal.underwriterNotes}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/distributor/proposals/${proposal._id}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <FileText size={14} />
                    View Application
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

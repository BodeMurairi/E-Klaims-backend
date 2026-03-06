"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Shield, FileText, XCircle, AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { POLICY_STATUSES, PROPOSAL_STATUSES, PRODUCT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type FilterKey = "all" | "active" | "under_review" | "more_documents" | "rejected";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "under_review", label: "Under Review" },
  { key: "more_documents", label: "More Documents" },
  { key: "rejected", label: "Rejected" },
];

export default function ClientPoliciesPage() {
  const { convexUser } = useCurrentUser();
  const [filter, setFilter] = useState<FilterKey>("all");

  const policies = useQuery(api.policies.listByClient, convexUser ? { clientId: convexUser._id } : "skip");
  const proposals = useQuery(api.proposals.listByClient, convexUser ? { clientId: convexUser._id } : "skip");

  const isLoading = !policies || !proposals;

  // Show all non-converted proposals (under review, more docs needed, or rejected)
  const openProposals = (proposals ?? []).filter(
    (p) => !p.convertedPolicyId && (
      p.status === "pending" ||
      p.status === "under_review" ||
      p.status === "rejected" ||
      p.status === "more_documents"
    )
  );

  // Build a unified list with type tag
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
    if (filter === "under_review")
      return item.kind === "proposal" && (item.data.status === "pending" || item.data.status === "under_review");
    if (filter === "more_documents")
      return item.kind === "proposal" && item.data.status === "more_documents";
    if (filter === "rejected")
      return item.kind === "proposal" && item.data.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Policies</h2>

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
              ? "No policies yet. Contact your agent to get started."
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
                <Link
                  key={policy._id}
                  href={`/client/policies/${policy._id}`}
                  className="block bg-white rounded-xl border p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{policy.policyNumber}</p>
                      <p className="text-sm text-gray-500">{product?.label ?? policy.productType}</p>
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
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                      <FileText size={14} />
                      View Policy Document
                    </span>
                    {policy.status === "active" && (
                      <Link
                        href={`/client/claims/new?policyId=${policy._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        File a Claim
                      </Link>
                    )}
                  </div>
                </Link>
              );
            }

            // Proposal card
            const proposal = item.data;
            const statusInfo = PROPOSAL_STATUSES.find((s) => s.value === proposal.status);
            const product = PRODUCT_TYPES.find((p) => p.value === proposal.productType);
            const isRejected = proposal.status === "rejected";
            const needsDocs = proposal.status === "more_documents";
            const isUnderReview = proposal.status === "pending" || proposal.status === "under_review";

            const CardWrapper = needsDocs ? Link : "div";
            const cardProps = needsDocs
              ? { href: `/client/policies/resubmit/${proposal._id}` }
              : {};

            return (
              <CardWrapper
                key={proposal._id}
                {...(cardProps as any)}
                className={cn(
                  "block bg-white rounded-xl border p-5 shadow-sm",
                  isRejected && "border-red-100 bg-red-50/30",
                  needsDocs && "border-orange-200 bg-orange-50/20 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer",
                  isUnderReview && "border-blue-100 bg-blue-50/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isRejected && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                    {needsDocs && <AlertTriangle size={16} className="text-orange-400 flex-shrink-0" />}
                    {isUnderReview && <Clock size={16} className="text-blue-400 flex-shrink-0" />}
                    <div>
                      <p className="font-semibold text-gray-900">{product?.label ?? proposal.productType}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Application · {formatDate(proposal.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusInfo?.color ?? "bg-gray-100 text-gray-800")}>
                      {statusInfo?.label ?? proposal.status}
                    </span>
                    {needsDocs && <ChevronRight size={14} className="text-orange-400" />}
                  </div>
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

                {needsDocs && (
                  <p className="mt-3 text-xs text-orange-600 font-medium">Tap to upload required documents →</p>
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
              </CardWrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}

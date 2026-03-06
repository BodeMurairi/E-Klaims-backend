"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Shield, FileText, XCircle } from "lucide-react";
import { POLICY_STATUSES, PROPOSAL_STATUSES, PRODUCT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ClientPoliciesPage() {
  const { convexUser } = useCurrentUser();
  const policies = useQuery(api.policies.listByClient, convexUser ? { clientId: convexUser._id } : "skip");
  const proposals = useQuery(api.proposals.listByClient, convexUser ? { clientId: convexUser._id } : "skip");

  const isLoading = !policies || !proposals;

  // Proposals that are not yet converted to a policy (pending/under_review/more_documents/rejected)
  const nonPolicyProposals = (proposals ?? []).filter(
    (p) => !p.convertedPolicyId
  );

  const hasAnything = (policies?.length ?? 0) > 0 || nonPolicyProposals.length > 0;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">My Policies & Applications</h2>

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : !hasAnything ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Shield size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No policies yet. Contact your agent to get started.</p>
        </div>
      ) : (
        <>
          {/* ── Active / issued policies ─────────────────────────── */}
          {(policies?.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Issued Policies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policies!.map((policy) => {
                  const statusInfo = POLICY_STATUSES.find((s) => s.value === policy.status);
                  const product = PRODUCT_TYPES.find((p) => p.value === policy.productType);
                  return (
                    <div key={policy._id} className="bg-white rounded-xl border p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{policy.policyNumber}</p>
                          <p className="text-sm text-gray-500">{product?.label ?? policy.productType}</p>
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusInfo?.color ?? "bg-gray-100 text-gray-800")}>
                          {statusInfo?.label ?? policy.status}
                        </span>
                      </div>
                      {policy.notes && (
                        <p className="text-sm text-gray-600 mt-2">{policy.notes}</p>
                      )}
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
                          href={`/client/policies/${policy._id}`}
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <FileText size={14} />
                          View Policy Document
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Proposals (pending / in-review / rejected) ────────── */}
          {nonPolicyProposals.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Applications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nonPolicyProposals.map((proposal) => {
                  const statusInfo = PROPOSAL_STATUSES.find((s) => s.value === proposal.status);
                  const product = PRODUCT_TYPES.find((p) => p.value === proposal.productType);
                  const isRejected = proposal.status === "rejected";
                  return (
                    <div
                      key={proposal._id}
                      className={cn(
                        "bg-white rounded-xl border p-5 shadow-sm",
                        isRejected && "border-red-100 bg-red-50/30"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {isRejected && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {product?.label ?? proposal.productType}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Application · {formatDate(proposal.createdAt)}
                            </p>
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
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

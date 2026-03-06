"use client";

import { useQuery, useMutation } from "convex/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { RiskScorePanel } from "@/components/proposals/RiskScorePanel";
import { DocumentList } from "@/components/documents/DocumentList";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { PRODUCT_TYPES } from "@/lib/constants";
import { useState } from "react";
import { toast } from "sonner";

export default function ClientProposalDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { convexUser } = useCurrentUser();
  const router = useRouter();
  const proposal = useQuery(api.proposals.getById, { id: id as Id<"proposals"> });
  const agent = useQuery(api.users.getById, proposal?.distributorId ? { id: proposal.distributorId } : "skip");
  const confirmAgentOnboarding = useMutation(api.proposals.confirmAgentOnboarding);
  const rejectAgentOnboarding = useMutation(api.proposals.rejectAgentOnboarding);
  const [loading, setLoading] = useState<"confirm" | "decline" | null>(null);

  if (!proposal || !convexUser) return <div className="text-gray-400 p-6">Loading...</div>;

  const product = PRODUCT_TYPES.find((p) => p.value === proposal.productType);

  const handleConfirm = async () => {
    setLoading("confirm");
    try {
      await confirmAgentOnboarding({ proposalId: proposal._id });
      toast.success("Application confirmed and submitted for review.");
      router.push("/client");
    } catch {
      toast.error("Failed to confirm. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    setLoading("decline");
    try {
      await rejectAgentOnboarding({ proposalId: proposal._id });
      toast.success("Application declined.");
      router.push("/client");
    } catch {
      toast.error("Failed to decline. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/client" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">{product?.label ?? proposal.productType} Application</h2>
          <ProposalStatusBadge status={proposal.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Product", value: product?.label ?? proposal.productType },
          { label: "Sum Insured", value: formatCurrency(proposal.sumInsured) },
          { label: "Premium", value: proposal.premium ? formatCurrency(proposal.premium) : "—" },
          { label: "Submitted by", value: agent ? `${agent.name} (Agent)` : "You" },
          { label: "Submitted", value: formatDate(proposal.createdAt) },
          { label: "Last Updated", value: formatDate(proposal.updatedAt) },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg border p-3">
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      <RiskScorePanel score={proposal.aiRiskScore} summary={proposal.aiRiskSummary} />

      {proposal.underwriterNotes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 mb-1">UNDERWRITER NOTES</p>
          <p className="text-sm text-gray-700">{proposal.underwriterNotes}</p>
        </div>
      )}

      {proposal.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-medium text-red-600 mb-1">REASON FOR DECLINE</p>
          <p className="text-sm text-red-800">{proposal.rejectionReason}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-sm text-gray-800 mb-3">Documents</h3>
        <DocumentList entityId={id} entityType="proposal" />
      </div>

      {proposal.pendingClientConfirmation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Your Confirmation is Required</p>
          <p className="text-xs text-amber-700">
            {agent ? `${agent.name}` : "Your agent"} has prepared this application on your behalf. By confirming, you authorize it to be submitted for underwriter review.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <X size={14} />
              {loading === "decline" ? "Declining..." : "Decline"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <UserCheck size={14} />
              {loading === "confirm" ? "Confirming..." : "Confirm & Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

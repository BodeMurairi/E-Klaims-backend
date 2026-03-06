"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { RiskScorePanel } from "@/components/proposals/RiskScorePanel";
import { DocumentList } from "@/components/documents/DocumentList";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, CheckCircle, XCircle, FileQuestion, Send, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PRODUCT_TYPES } from "@/lib/constants";

export default function UnderwriterProposalReviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { convexUser } = useCurrentUser();
  const proposal = useQuery(api.proposals.getById, { id: id as Id<"proposals"> });
  const client = useQuery(api.users.getById, proposal?.clientId ? { id: proposal.clientId } : "skip");
  const updateStatus = useMutation(api.proposals.updateStatus);

  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Document request panel state
  const [showDocRequest, setShowDocRequest] = useState(false);
  const [docList, setDocList] = useState("");

  if (!proposal || !convexUser) return <div className="text-gray-400 p-6">Loading...</div>;

  const product = PRODUCT_TYPES.find((p) => p.value === proposal.productType);
  const isReviewable = ["pending", "under_review", "more_documents"].includes(proposal.status);

  const handleAction = async (
    status: "approved" | "rejected" | "more_documents",
    extra?: { requestedDocuments?: string }
  ) => {
    setLoading(true);
    try {
      await updateStatus({
        proposalId: proposal._id,
        status,
        underwriterNotes: status === "more_documents" ? (docList || notes || undefined) : (notes || undefined),
        rejectionReason: status === "rejected" ? rejectionReason : undefined,
        underwriterId: convexUser._id,
        requestedDocuments: extra?.requestedDocuments,
      });
      toast.success(
        status === "approved"
          ? "Proposal approved — policy issued"
          : status === "rejected"
          ? "Proposal rejected"
          : "Document request sent to client and agent"
      );
      if (status === "more_documents") {
        setShowDocRequest(false);
        setDocList("");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendDocRequest = () => {
    if (!docList.trim()) {
      toast.error("Please list the required documents");
      return;
    }
    handleAction("more_documents", { requestedDocuments: docList.trim() });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/underwriter/proposals" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">{product?.label} Proposal</h2>
          <ProposalStatusBadge status={proposal.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Client", value: client?.name ?? "—" },
          { label: "Client Email", value: client?.email ?? "—" },
          { label: "Sum Insured", value: formatCurrency(proposal.sumInsured) },
          { label: "Premium", value: proposal.premium ? formatCurrency(proposal.premium) : "—" },
          { label: "Submitted", value: formatDate(proposal.createdAt) },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg border p-3">
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      <RiskScorePanel score={proposal.aiRiskScore} summary={proposal.aiRiskSummary} />

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-sm text-gray-800 mb-3">Documents</h3>
        <DocumentList entityId={id} entityType="proposal" showVerification />
      </div>

      {isReviewable && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Review Decision</h3>

          <div className="space-y-1.5">
            <Label>Notes for Agent</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes or feedback..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Rejection Reason (if rejecting)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Required if rejecting..."
              rows={2}
            />
          </div>

          {/* Document Request Panel */}
          {showDocRequest && (
            <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-900">Request Additional Documents</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    List each document on a new line. This will be sent to both the client and agent.
                  </p>
                </div>
                <button
                  onClick={() => { setShowDocRequest(false); setDocList(""); }}
                  className="text-orange-400 hover:text-orange-600"
                >
                  <X size={16} />
                </button>
              </div>
              <Textarea
                value={docList}
                onChange={(e) => setDocList(e.target.value)}
                placeholder={"e.g.\n- National ID / Passport\n- Bank statement (last 3 months)\n- Proof of ownership"}
                rows={5}
                className="bg-white border-orange-200 focus:border-orange-400 text-sm"
              />
              <Button
                size="sm"
                disabled={loading || !docList.trim()}
                onClick={handleSendDocRequest}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Send size={14} />
                Send Request
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            {!showDocRequest && (
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => setShowDocRequest(true)}
                className="flex items-center gap-2"
              >
                <FileQuestion size={14} /> Request Documents
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              disabled={loading}
              onClick={() => handleAction("rejected")}
              className="flex items-center gap-2"
            >
              <XCircle size={14} /> Reject
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => handleAction("approved")}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={14} /> Approve
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

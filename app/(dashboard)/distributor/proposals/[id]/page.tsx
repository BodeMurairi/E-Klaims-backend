"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { RiskScorePanel } from "@/components/proposals/RiskScorePanel";
import { DocumentList } from "@/components/documents/DocumentList";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PRODUCT_TYPES } from "@/lib/constants";

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const proposal = useQuery(api.proposals.getById, { id: id as Id<"proposals"> });
  const client = useQuery(api.users.getById, proposal?.clientId ? { id: proposal.clientId } : "skip");

  if (!proposal) return <div className="text-gray-400 p-6">Loading...</div>;

  const product = PRODUCT_TYPES.find(p => p.value === proposal.productType);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/distributor/proposals" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">{product?.label} Proposal</h2>
          <ProposalStatusBadge status={proposal.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Client", value: client?.name ?? "—" },
          { label: "Product", value: product?.label ?? proposal.productType },
          { label: "Sum Insured", value: formatCurrency(proposal.sumInsured) },
          { label: "Premium", value: proposal.premium ? formatCurrency(proposal.premium) : "—" },
          { label: "Submitted", value: formatDate(proposal.createdAt) },
          { label: "Last Updated", value: formatDate(proposal.updatedAt) },
        ].map(item => (
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
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs font-medium text-red-600 mb-1">REJECTION REASON</p>
          <p className="text-sm text-gray-700">{proposal.rejectionReason}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-sm text-gray-800 mb-3">Documents</h3>
        <DocumentList entityId={id} entityType="proposal" />
      </div>
    </div>
  );
}

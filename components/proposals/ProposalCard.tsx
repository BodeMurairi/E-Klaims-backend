import Link from "next/link";
import { ProposalStatusBadge } from "./ProposalStatusBadge";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { PRODUCT_TYPES } from "@/lib/constants";

interface ProposalCardProps {
  proposal: { _id: string; productType: string; sumInsured: number; status: string; createdAt: number; aiRiskScore?: number };
  href: string;
}

export function ProposalCard({ proposal, href }: ProposalCardProps) {
  const product = PRODUCT_TYPES.find((p) => p.value === proposal.productType);
  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{product?.label ?? proposal.productType}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(proposal.createdAt)}</p>
          </div>
          <ProposalStatusBadge status={proposal.status} size="sm" />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Sum insured: <span className="font-medium text-gray-800">{formatCurrency(proposal.sumInsured)}</span></span>
          {proposal.aiRiskScore !== undefined && (
            <span className={`font-medium px-2 py-0.5 rounded-full ${proposal.aiRiskScore < 40 ? "bg-green-100 text-green-700" : proposal.aiRiskScore < 65 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
              Risk: {proposal.aiRiskScore}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

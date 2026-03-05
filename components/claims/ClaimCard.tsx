import Link from "next/link";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import { formatDate, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { MapPin, Calendar } from "lucide-react";

interface ClaimCardProps {
  claim: {
    _id: string;
    claimId: string;
    status: string;
    description: string;
    location: string;
    estimatedLoss: number;
    dateOfLoss: number;
    createdAt: number;
  };
  href: string;
}

export function ClaimCard({ claim, href }: ClaimCardProps) {
  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{claim.claimId}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(claim.createdAt)}</p>
          </div>
          <ClaimStatusBadge status={claim.status} size="sm" />
        </div>

        <p className="text-sm text-gray-600 mt-3 line-clamp-2">{claim.description}</p>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {claim.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {formatDate(claim.dateOfLoss)}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-500">Estimated loss: </span>
          <span className="text-xs font-semibold text-gray-800">
            {formatCurrency(claim.estimatedLoss)}
          </span>
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { ClaimDetailTabs } from "@/components/claims/ClaimDetailTabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ClientClaimDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { convexUser } = useCurrentUser();
  const claim = useQuery(api.claims.getById, { id: id as Id<"claims"> });

  if (!claim || !convexUser) return <div className="text-gray-400 text-sm p-6">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/client/claims" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{claim.claimId}</h2>
            <ClaimStatusBadge status={claim.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{claim.description}</p>
        </div>
      </div>

      <ClaimDetailTabs claim={claim} currentUserId={convexUser._id} isClient />
    </div>
  );
}

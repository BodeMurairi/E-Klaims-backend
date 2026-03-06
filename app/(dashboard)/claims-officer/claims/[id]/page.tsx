"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { ClaimDetailTabs } from "@/components/claims/ClaimDetailTabs";
import { StatusAdvancePanel } from "@/components/claims/StatusAdvancePanel";
import { AssessorAssignModal } from "@/components/claims/AssessorAssignModal";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

export default function ClaimsOfficerClaimDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { convexUser } = useCurrentUser();
  const claim = useQuery(api.claims.getById, { id: id as Id<"claims"> });
  const [showAssign, setShowAssign] = useState(false);

  if (!claim || !convexUser) return <div className="text-gray-400 p-6">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/claims-officer/claims" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{claim.claimId}</h2>
            <ClaimStatusBadge status={claim.status} />
            {claim.approvedAmount && (
              <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                Approved: {formatCurrency(claim.approvedAmount)}
              </span>
            )}
          </div>
        </div>

        {claim.status === "under_review" && !claim.assignedAssessorId && (
          <Button size="sm" variant="outline" onClick={() => setShowAssign(true)} className="flex items-center gap-2">
            <UserPlus size={14} /> Assign Assessor
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClaimDetailTabs claim={claim} currentUserId={convexUser._id} />
        </div>
        <div className="space-y-4">
          <StatusAdvancePanel claimId={claim._id} currentStatus={claim.status} userId={convexUser._id} />
          {claim.assignedAssessorId && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-medium text-indigo-600 mb-1">ASSESSOR ASSIGNED</p>
              <p className="text-sm text-gray-700">Assessor ID: {claim.assignedAssessorId}</p>
            </div>
          )}
        </div>
      </div>

      {showAssign && (
        <AssessorAssignModal claimId={claim._id} officerId={convexUser._id} open={showAssign} onClose={() => setShowAssign(false)} />
      )}
    </div>
  );
}

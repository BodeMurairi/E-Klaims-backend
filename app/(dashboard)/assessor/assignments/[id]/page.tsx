"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { ClaimDetailTabs } from "@/components/claims/ClaimDetailTabs";
import { AssessmentForm } from "@/components/claims/AssessmentForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function AssessorAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { convexUser } = useCurrentUser();
  const claim = useQuery(api.claims.getById, { id: id as Id<"claims"> });

  if (!claim || !convexUser) return <div className="text-gray-400 p-6">Loading...</div>;

  const canAssess = claim.status === "assessor_assigned";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/assessor/assignments" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">{claim.claimId}</h2>
          <ClaimStatusBadge status={claim.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClaimDetailTabs claim={claim} currentUserId={convexUser._id} />
        </div>
        <div>
          {canAssess ? (
            <AssessmentForm claimId={claim._id} assessorId={convexUser._id} />
          ) : (
            <div className="bg-gray-50 rounded-xl border p-4 text-center">
              <p className="text-sm text-gray-500">
                {claim.status === "assessment_completed"
                  ? "Assessment already submitted"
                  : "Assessment not yet required"}
              </p>
              {claim.assessmentFindings && (
                <div className="mt-3 text-left">
                  <p className="text-xs font-medium text-gray-500 mb-1">Your Findings</p>
                  <p className="text-sm text-gray-700">{claim.assessmentFindings}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

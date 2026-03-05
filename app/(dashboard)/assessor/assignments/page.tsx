"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClaimCard } from "@/components/claims/ClaimCard";
import { ClipboardCheck } from "lucide-react";

export default function AssessorAssignmentsPage() {
  const { convexUser } = useCurrentUser();
  const assignments = useQuery(api.claims.listByAssessor, convexUser ? { assessorId: convexUser._id } : "skip");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
      {!assignments ? <div className="text-gray-400">Loading...</div> :
        assignments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <ClipboardCheck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No assignments yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map(c => (
              <ClaimCard key={c._id} claim={c} href={`/assessor/assignments/${c._id}`} />
            ))}
          </div>
        )
      }
    </div>
  );
}

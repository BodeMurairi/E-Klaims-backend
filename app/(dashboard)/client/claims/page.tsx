"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClaimCard } from "@/components/claims/ClaimCard";
import { Plus, FileText, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

function PendingClaimBanner({ claim, clientId }: {
  claim: { _id: Id<"claims">; claimId: string; description: string; estimatedLoss: number; initiatedByDistributorId?: Id<"users"> };
  clientId: Id<"users">;
}) {
  const agent = useQuery(api.users.getById, claim.initiatedByDistributorId ? { id: claim.initiatedByDistributorId } : "skip");
  const confirm = useMutation(api.claims.confirmByClient);
  const decline = useMutation(api.claims.declineByClient);
  const [loading, setLoading] = useState<"confirm" | "decline" | null>(null);

  const handleConfirm = async () => {
    setLoading("confirm");
    try {
      await confirm({ claimId: claim._id, clientId });
      toast.success("Claim confirmed — it's now with the claims team.");
    } catch {
      toast.error("Failed to confirm claim.");
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    setLoading("decline");
    try {
      await decline({ claimId: claim._id, clientId });
      toast.success("Claim declined and removed.");
    } catch {
      toast.error("Failed to decline claim.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm">
            Claim {claim.claimId} submitted by your agent
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            {agent ? `${agent.name} submitted this claim on your behalf.` : "Your agent submitted this claim on your behalf."}
          </p>
          <p className="text-xs text-amber-800 mt-2 line-clamp-2">{claim.description}</p>
          <p className="text-xs text-amber-700 mt-1">
            Estimated loss: <span className="font-medium">KES {claim.estimatedLoss.toLocaleString()}</span>
          </p>
        </div>
      </div>
      <div className="mb-3">
        <Link
          href={`/client/claims/${claim._id}`}
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
        >
          <Eye size={12} /> View Full Claim Details & Documents →
        </Link>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleDecline}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <XCircle size={14} />
          {loading === "decline" ? "Declining..." : "Decline"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle size={14} />
          {loading === "confirm" ? "Confirming..." : "Confirm & Submit"}
        </button>
      </div>
    </div>
  );
}

export default function ClientClaimsPage() {
  const { convexUser } = useCurrentUser();
  const claims = useQuery(api.claims.listByClient, convexUser ? { clientId: convexUser._id } : "skip");

  const pendingClaims = (claims ?? []).filter((c) => c.pendingClientConfirmation);
  const activeClaims = (claims ?? []).filter((c) => !c.pendingClientConfirmation);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Claims</h2>
        <Link href="/client/claims/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> File a Claim
        </Link>
      </div>

      {/* Agent-initiated claims awaiting confirmation */}
      {pendingClaims.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-amber-700">
            {pendingClaims.length} claim{pendingClaims.length !== 1 ? "s" : ""} awaiting your confirmation
          </p>
          {pendingClaims.map((claim) => (
            <PendingClaimBanner key={claim._id} claim={claim} clientId={convexUser!._id} />
          ))}
        </div>
      )}

      {!claims ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : activeClaims.length === 0 && pendingClaims.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <FileText size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No claims filed yet</p>
          <Link href="/client/claims/new" className="text-sm text-blue-600 hover:underline">File your first claim →</Link>
        </div>
      ) : activeClaims.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeClaims.map(claim => (
            <ClaimCard key={claim._id} claim={claim} href={`/client/claims/${claim._id}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { ClaimDetailTabs } from "@/components/claims/ClaimDetailTabs";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function ClientClaimDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { convexUser } = useCurrentUser();
  const router = useRouter();
  const claim = useQuery(api.claims.getById, { id: id as Id<"claims"> });
  const agent = useQuery(api.users.getById, claim?.initiatedByDistributorId ? { id: claim.initiatedByDistributorId } : "skip");
  const confirmByClient = useMutation(api.claims.confirmByClient);
  const declineByClient = useMutation(api.claims.declineByClient);
  const [loading, setLoading] = useState<"confirm" | "decline" | null>(null);

  if (!claim || !convexUser) return <div className="text-gray-400 text-sm p-6">Loading...</div>;

  const handleConfirm = async () => {
    setLoading("confirm");
    try {
      await confirmByClient({ claimId: claim._id, clientId: convexUser._id });
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
      await declineByClient({ claimId: claim._id, clientId: convexUser._id });
      toast.success("Claim declined and removed.");
      router.push("/client/claims");
    } catch {
      toast.error("Failed to decline claim.");
    } finally {
      setLoading(null);
    }
  };

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

      {claim.pendingClientConfirmation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Your Confirmation is Required</p>
          <p className="text-xs text-amber-700">
            {agent ? `${agent.name}` : "Your agent"} submitted this claim on your behalf. Please review the details above before confirming.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle size={14} />
              {loading === "decline" ? "Declining..." : "Decline"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle size={14} />
              {loading === "confirm" ? "Confirming..." : "Confirm & Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

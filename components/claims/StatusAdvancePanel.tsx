"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { CLAIM_STATUSES } from "@/lib/constants";

const TRANSITIONS: Record<string, string[]> = {
  submitted: ["documents_pending", "under_review"],
  documents_pending: ["under_review"],
  under_review: ["assessor_assigned", "approved", "rejected"],
  assessor_assigned: ["assessment_completed"],
  assessment_completed: ["approved", "rejected"],
  approved: ["payment_processing"],
  payment_processing: ["paid"],
};

interface StatusAdvancePanelProps {
  claimId: Id<"claims">;
  currentStatus: string;
  userId: Id<"users">;
  onStatusChanged?: () => void;
}

export function StatusAdvancePanel({ claimId, currentStatus, userId, onStatusChanged }: StatusAdvancePanelProps) {
  const [notes, setNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const updateStatus = useMutation(api.claims.updateStatus);
  const approveClaim = useMutation(api.claims.approveClaim);
  const rejectClaim = useMutation(api.claims.rejectClaim);

  const nextStatuses = TRANSITIONS[currentStatus] ?? [];
  if (nextStatuses.length === 0) return null;

  const handleTransition = async (newStatus: string) => {
    setLoading(true);
    try {
      if (newStatus === "approved") {
        if (!approvedAmount) { toast.error("Enter approved amount"); setLoading(false); return; }
        await approveClaim({ claimId, userId, approvedAmount: parseFloat(approvedAmount), notes: notes || undefined });
      } else if (newStatus === "rejected") {
        if (!rejectionReason) { toast.error("Enter rejection reason"); setLoading(false); return; }
        await rejectClaim({ claimId, userId, rejectionReason });
      } else {
        await updateStatus({ claimId, newStatus, userId, notes: notes || undefined });
      }
      toast.success(`Status updated to: ${CLAIM_STATUSES.find(s => s.value === newStatus)?.label ?? newStatus}`);
      setNotes("");
      onStatusChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const isApproveVisible = nextStatuses.includes("approved");
  const isRejectVisible = nextStatuses.includes("rejected");
  const otherStatuses = nextStatuses.filter(s => s !== "approved" && s !== "rejected");

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">Advance Claim Status</h3>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes for this status change..." rows={2} />
      </div>

      {isApproveVisible && (
        <div className="space-y-1.5">
          <Label className="text-xs">Approved Amount (KES)</Label>
          <Input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} placeholder="0.00" />
        </div>
      )}

      {isRejectVisible && (
        <div className="space-y-1.5">
          <Label className="text-xs">Rejection Reason</Label>
          <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." rows={2} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {otherStatuses.map(status => {
          const info = CLAIM_STATUSES.find(s => s.value === status);
          return (
            <Button key={status} size="sm" variant="outline" disabled={loading} onClick={() => handleTransition(status)} className="flex items-center gap-1">
              <ChevronRight size={13} />
              {info?.label ?? status}
            </Button>
          );
        })}

        {isApproveVisible && (
          <Button size="sm" disabled={loading} onClick={() => handleTransition("approved")} className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
            <CheckCircle size={13} />
            Approve
          </Button>
        )}

        {isRejectVisible && (
          <Button size="sm" variant="destructive" disabled={loading} onClick={() => handleTransition("rejected")} className="flex items-center gap-1">
            <XCircle size={13} />
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}

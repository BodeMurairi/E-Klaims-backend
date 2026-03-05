"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";

interface AssessmentFormProps {
  claimId: Id<"claims">;
  assessorId: Id<"users">;
  onSubmitted?: () => void;
}

export function AssessmentForm({ claimId, assessorId, onSubmitted }: AssessmentFormProps) {
  const [findings, setFindings] = useState("");
  const [recommendedAmount, setRecommendedAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const submitAssessment = useMutation(api.claims.submitAssessment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findings || !recommendedAmount) return;
    setLoading(true);
    try {
      await submitAssessment({
        claimId,
        assessorId,
        findings,
        recommendedAmount: parseFloat(recommendedAmount),
      });
      toast.success("Assessment submitted successfully");
      onSubmitted?.();
    } catch {
      toast.error("Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-blue-600" />
        <h3 className="font-semibold text-gray-800">Submit Assessment</h3>
      </div>

      <div className="space-y-1.5">
        <Label>Assessment Findings</Label>
        <Textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="Describe your findings from the site visit, extent of damage, and any relevant observations..."
          rows={5}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Recommended Payout Amount (KES)</Label>
        <Input
          type="number"
          value={recommendedAmount}
          onChange={(e) => setRecommendedAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          required
        />
      </div>

      <Button type="submit" disabled={loading || !findings || !recommendedAmount} className="w-full">
        {loading ? "Submitting..." : "Submit Assessment"}
      </Button>
    </form>
  );
}

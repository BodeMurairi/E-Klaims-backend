"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2;

export default function DistributorNewClaimPage() {
  const { convexUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const policyId = searchParams.get("policyId") as Id<"policies"> | null;
  const clientId = searchParams.get("clientId") as Id<"users"> | null;

  const policy = useQuery(api.policies.getById, policyId ? { id: policyId } : "skip");
  const client = useQuery(api.users.getById, clientId ? { id: clientId } : "skip");

  const submitByAgent = useMutation(api.claims.submitByAgent);
  const sendForClientConfirmation = useMutation(api.claims.sendForClientConfirmation);

  const [step, setStep] = useState<Step>(1);
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedLoss, setEstimatedLoss] = useState("");
  const [loading, setLoading] = useState(false);
  const [newClaimId, setNewClaimId] = useState<Id<"claims"> | null>(null);

  if (!policyId || !clientId) {
    return (
      <div className="max-w-xl space-y-4">
        <Link href="/distributor/policies" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="bg-white rounded-xl border p-6 text-center text-gray-500">
          Invalid claim request. Please start from a policy card.
        </div>
      </div>
    );
  }

  const handleAdvance = async () => {
    if (!convexUser) return;
    if (!dateOfLoss || !location || !description || !estimatedLoss) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const result = await submitByAgent({
        policyId,
        clientId,
        distributorId: convexUser._id,
        dateOfLoss: new Date(dateOfLoss).getTime(),
        description,
        location,
        estimatedLoss: parseFloat(estimatedLoss),
        documents: [],
      });
      setNewClaimId(result.id);
      setStep(2);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create claim");
    } finally {
      setLoading(false);
    }
  };

  const handleSendConfirmation = async () => {
    if (!convexUser || !newClaimId) return;
    setLoading(true);
    try {
      await sendForClientConfirmation({ claimId: newClaimId, distributorId: convexUser._id });
      toast.success("Claim sent — the client will be notified to confirm.");
      router.push("/distributor/policies");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send confirmation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/distributor/policies" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">File a Claim</h2>
          <p className="text-sm text-gray-500 mt-0.5">On behalf of {client?.name ?? "client"}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"}`}>{s}</div>
            {s < 2 && <div className={`h-0.5 w-16 ${step > s ? "bg-orange-500" : "bg-gray-200"}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-gray-500">
          {step === 1 ? "Incident Details" : "Upload Documents"}
        </div>
      </div>

      {/* Confirmation notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          The client will receive a notification to <strong>confirm or decline</strong> this claim after you upload supporting documents.
        </p>
      </div>

      {/* Policy summary */}
      {policy && (
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Policy</p>
          <p className="font-semibold text-gray-900">{policy.policyNumber}</p>
          <p className="text-sm text-gray-500">{policy.productType} · Sum insured: KES {policy.sumInsured.toLocaleString()}</p>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Incident Details</h3>

          <div className="space-y-1.5">
            <Label>Date of Loss <span className="text-red-500">*</span></Label>
            <Input type="date" value={dateOfLoss} onChange={(e) => setDateOfLoss(e.target.value)} max={new Date().toISOString().split("T")[0]} />
          </div>

          <div className="space-y-1.5">
            <Label>Location <span className="text-red-500">*</span></Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where did the incident occur?" />
          </div>

          <div className="space-y-1.5">
            <Label>Description of Loss <span className="text-red-500">*</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened..." rows={4} />
          </div>

          <div className="space-y-1.5">
            <Label>Estimated Loss Amount (KES) <span className="text-red-500">*</span></Label>
            <Input type="number" value={estimatedLoss} onChange={(e) => setEstimatedLoss(e.target.value)} placeholder="0.00" min="0" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link href="/distributor/policies" className="text-sm text-gray-400 hover:text-gray-600">Cancel</Link>
            <Button
              onClick={handleAdvance}
              disabled={loading || !dateOfLoss || !location || !description || !estimatedLoss}
              className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
            >
              {loading ? "Saving..." : "Next: Upload Documents"}
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && newClaimId && convexUser && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Upload Supporting Documents</h3>
          <p className="text-sm text-gray-500">Upload any evidence for this claim (police report, photos, estimates, etc.) before notifying the client.</p>

          <DocumentUploader
            entityId={newClaimId}
            entityType="claim"
            uploadedBy={convexUser._id}
            label="Upload Claim Documents"
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">Documents are optional but recommended</p>
            <Button
              onClick={handleSendConfirmation}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {loading ? "Sending..." : "Send for Client Confirmation"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

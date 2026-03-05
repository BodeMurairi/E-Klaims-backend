"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceNoteRecorder } from "./VoiceNoteRecorder";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft } from "lucide-react";

type Step = 1 | 2 | 3;

interface ClaimFormProps {
  clientId: Id<"users">;
  submittedBy: Id<"users">;
  redirectTo: string;
}

export function ClaimForm({ clientId, submittedBy, redirectTo }: ClaimFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [policyId, setPolicyId] = useState<string>("");
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedLoss, setEstimatedLoss] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [uploadedDocIds, setUploadedDocIds] = useState<Id<"documents">[]>([]);
  const [newClaimId, setNewClaimId] = useState<Id<"claims"> | null>(null);

  const policies = useQuery(api.policies.listByClient, { clientId });
  const submitClaim = useMutation(api.claims.submit);

  const handleSubmit = async () => {
    if (!policyId || !dateOfLoss || !location || !description || !estimatedLoss) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const result = await submitClaim({
        policyId: policyId as Id<"policies">,
        clientId,
        submittedBy,
        dateOfLoss: new Date(dateOfLoss).getTime(),
        description,
        location,
        estimatedLoss: parseFloat(estimatedLoss),
        documents: uploadedDocIds,
        voiceNoteTranscript: voiceTranscript || undefined,
      });
      toast.success(`Claim ${result.claimId} submitted successfully!`);
      router.push(redirectTo);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit claim");
    } finally {
      setLoading(false);
    }
  };

  const activePolicies = policies?.filter(p => p.status === "active") ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>{s}</div>
            {s < 3 && <div className={`h-0.5 w-16 ${step > s ? "bg-blue-600" : "bg-gray-200"}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-gray-500">
          {step === 1 ? "Incident Details" : step === 2 ? "Voice Note" : "Documents"}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-800">Incident Details</h2>

          <div className="space-y-1.5">
            <Label>Policy <span className="text-red-500">*</span></Label>
            <Select value={policyId} onValueChange={setPolicyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a policy..." />
              </SelectTrigger>
              <SelectContent>
                {activePolicies.map(p => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.policyNumber} — {p.productType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activePolicies.length === 0 && <p className="text-xs text-orange-500">No active policies found</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Date of Loss <span className="text-red-500">*</span></Label>
            <Input type="date" value={dateOfLoss} onChange={e => setDateOfLoss(e.target.value)} max={new Date().toISOString().split("T")[0]} />
          </div>

          <div className="space-y-1.5">
            <Label>Location <span className="text-red-500">*</span></Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Where did the incident occur?" />
          </div>

          <div className="space-y-1.5">
            <Label>Description of Loss <span className="text-red-500">*</span></Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what happened..." rows={4} />
          </div>

          <div className="space-y-1.5">
            <Label>Estimated Loss Amount (KES) <span className="text-red-500">*</span></Label>
            <Input type="number" value={estimatedLoss} onChange={e => setEstimatedLoss(e.target.value)} placeholder="0.00" min="0" />
          </div>

          <Button className="w-full flex items-center gap-2" onClick={() => setStep(2)} disabled={!policyId || !dateOfLoss || !location || !description || !estimatedLoss}>
            Next: Voice Note
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-800">Voice Note (Optional)</h2>
          <p className="text-sm text-gray-500">Record a voice note narrating what happened. Our AI will transcribe it to ensure no details are missed.</p>
          <VoiceNoteRecorder onTranscript={setVoiceTranscript} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 flex items-center gap-2" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> Back
            </Button>
            <Button className="flex-1 flex items-center gap-2" onClick={() => setStep(3)}>
              Next: Documents <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-800">Upload Documents</h2>
          <p className="text-sm text-gray-500">Upload supporting documents for your claim (police report, photos, estimates, etc.).</p>

          {newClaimId ? (
            <DocumentUploader
              entityId={newClaimId}
              entityType="claim"
              uploadedBy={submittedBy}
              onUploaded={docs => setUploadedDocIds(docs.map(d => d.documentId))}
            />
          ) : (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4 text-center">
              Documents will be attached after claim submission. You can also upload from the claim detail page.
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 flex items-center gap-2" onClick={() => setStep(2)}>
              <ChevronLeft size={16} /> Back
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Claim"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

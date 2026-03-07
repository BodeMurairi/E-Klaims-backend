"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, AlertTriangle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PRODUCT_TYPES } from "@/lib/constants";

export default function ResubmitProposalPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { convexUser } = useCurrentUser();
  const router = useRouter();

  const proposal = useQuery(api.proposals.getById, { id: id as Id<"proposals"> });
  const resubmit = useMutation(api.proposals.resubmitWithDocuments);

  const [clientNote, setClientNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!proposal || !convexUser) {
    return <div className="text-gray-400 p-6">Loading...</div>;
  }

  if (proposal.status !== "more_documents") {
    return (
      <div className="max-w-2xl space-y-4">
        <Link href="/client/policies" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={16} /> Back to Policies
        </Link>
        <div className="bg-white rounded-xl border p-6 text-center text-gray-500">
          This application is not currently awaiting additional documents.
        </div>
      </div>
    );
  }

  const product = PRODUCT_TYPES.find((p) => p.value === proposal.productType);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await resubmit({
        proposalId: proposal._id,
        clientNote: clientNote.trim() || undefined,
      });
      toast.success("Documents submitted — your application is back under review");
      router.push("/client/policies");
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/client/policies" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Submit Additional Documents</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {product?.label ?? proposal.productType} · Applied {formatDate(proposal.createdAt)}
          </p>
        </div>
      </div>

      {/* What was requested */}
      {proposal.underwriterNotes && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-900 mb-1">Documents Requested by Underwriter</p>
              <p className="text-sm text-orange-800 whitespace-pre-line">{proposal.underwriterNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Previously uploaded documents */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-sm text-gray-800 mb-3">Previously Uploaded Documents</h3>
        <DocumentList entityId={id} entityType="proposal" />
      </div>

      {/* Upload new documents */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-gray-800">Upload New Documents</h3>
        <DocumentUploader
          entityId={id}
          entityType="proposal"
          uploadedBy={convexUser._id}
          label="Upload requested documents"
        />
      </div>

      {/* Optional note */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h3 className="font-semibold text-sm text-gray-800">Note to Underwriter (optional)</h3>
        <div className="space-y-1.5">
          <Label htmlFor="note" className="sr-only">Note</Label>
          <Textarea
            id="note"
            value={clientNote}
            onChange={(e) => setClientNote(e.target.value)}
            placeholder="Add any context or explanation about the documents you've uploaded..."
            rows={3}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pb-6">
        <Link href="/client/policies" className="text-sm text-gray-400 hover:text-gray-600">
          Cancel
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600"
        >
          <Send size={14} />
          {loading ? "Submitting..." : "Submit Documents"}
        </Button>
      </div>
    </div>
  );
}

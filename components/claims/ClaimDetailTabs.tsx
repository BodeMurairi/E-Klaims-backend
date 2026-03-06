"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClaimStatusTimeline } from "./ClaimStatusTimeline";
import { DocumentList } from "@/components/documents/DocumentList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface ClaimDetailTabsProps {
  claim: {
    _id: string;
    claimId: string;
    status: string;
    dateOfLoss: number;
    description: string;
    location: string;
    estimatedLoss: number;
    approvedAmount?: number;
    rejectionReason?: string;
    voiceNoteTranscript?: string;
    assessmentFindings?: string;
    assessmentRecommendedAmount?: number;
    statusHistory: { status: string; timestamp: number; userId: Id<"users">; notes?: string }[];
  };
  currentUserId: Id<"users">;
  isClient?: boolean;
}

export function ClaimDetailTabs({ claim, currentUserId, isClient = false }: ClaimDetailTabsProps) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-4">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        {claim.voiceNoteTranscript && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 mb-2">VOICE NOTE TRANSCRIPT</p>
            <p className="text-sm text-gray-700 leading-relaxed">{claim.voiceNoteTranscript}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Date of Loss", value: formatDate(claim.dateOfLoss) },
            { label: "Location", value: claim.location },
            { label: "Estimated Loss", value: formatCurrency(claim.estimatedLoss) },
            { label: "Approved Amount", value: claim.approvedAmount ? formatCurrency(claim.approvedAmount) : "—" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-lg border p-3">
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-400 mb-1">Description of Loss</p>
          <p className="text-sm text-gray-800 leading-relaxed">{claim.description}</p>
        </div>

        {claim.status === "rejected" && claim.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Claim Rejected — Reason</p>
            <p className="text-sm text-red-800 leading-relaxed">{claim.rejectionReason}</p>
          </div>
        )}

        {claim.assessmentFindings && (
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-400 mb-1">Assessment Findings</p>
            <p className="text-sm text-gray-800 leading-relaxed">{claim.assessmentFindings}</p>
            {claim.assessmentRecommendedAmount && (
              <p className="text-sm font-semibold text-green-700 mt-2">
                Recommended payout: {formatCurrency(claim.assessmentRecommendedAmount)}
              </p>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="documents">
        <DocumentList entityId={claim._id} entityType="claim" showVerification />
      </TabsContent>

      <TabsContent value="messages" className="space-y-4">
        <MessageThread entityId={claim._id} entityType="claim" />
        <MessageInput entityId={claim._id} entityType="claim" senderId={currentUserId} />
      </TabsContent>

      <TabsContent value="history">
        <ClaimStatusTimeline statusHistory={claim.statusHistory} currentStatus={claim.status} />
      </TabsContent>
    </Tabs>
  );
}

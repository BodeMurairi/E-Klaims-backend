"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate } from "@/lib/utils";
import { File, CheckCircle, AlertTriangle, Clock, Eye, Download } from "lucide-react";
import { AIVerificationBadge } from "./AIVerificationBadge";

interface DocumentListProps {
  entityId: string;
  entityType: "claim" | "proposal" | "policy" | "onboarding";
  showVerification?: boolean;
}

export function DocumentList({ entityId, entityType, showVerification = false }: DocumentListProps) {
  const documents = useQuery(api.documents.getByEntity, { entityId, entityType });

  if (!documents) {
    return <div className="text-sm text-gray-400 py-4 text-center">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-6 text-center border-2 border-dashed rounded-xl">
        No documents uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc._id}
          className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-lg"
        >
          <File size={16} className="text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
            <p className="text-xs text-gray-400">{formatDate(doc.createdAt)}</p>
          </div>

          {showVerification && (
            <AIVerificationBadge verified={doc.verified} flagged={doc.flagged} flagReason={doc.flagReason} />
          )}

          {doc.fileUrl && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Preview document"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Eye size={15} />
              </a>
              <a
                href={doc.fileUrl}
                download={doc.name}
                title="Download document"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors"
              >
                <Download size={15} />
              </a>
            </div>
          )}

          <div className="flex-shrink-0">
            {doc.verified ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : doc.flagged ? (
              <AlertTriangle size={14} className="text-red-500" />
            ) : (
              <Clock size={14} className="text-gray-300" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

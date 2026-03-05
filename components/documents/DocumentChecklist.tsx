"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";

interface DocumentChecklistProps {
  productType: string;
  entityType: "claim" | "proposal" | "onboarding";
  uploadedDocumentNames: string[];
}

export function DocumentChecklist({
  productType,
  entityType,
  uploadedDocumentNames,
}: DocumentChecklistProps) {
  const requirements = useQuery(api.documentRequirements.getForProduct, {
    productType,
    entityType,
  });

  if (!requirements || requirements.length === 0) return null;

  const allRequired = requirements.flatMap((r) =>
    r.requiredDocuments.filter((d) => d.required)
  );

  const uploaded = new Set(uploadedDocumentNames.map((n) => n.toLowerCase()));

  const missingRequired = allRequired.filter(
    (doc) => !uploaded.has(doc.name.toLowerCase())
  );

  const allMet = missingRequired.length === 0;

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="flex items-center gap-2">
        {allMet ? (
          <CheckCircle size={16} className="text-green-500" />
        ) : (
          <AlertCircle size={16} className="text-orange-500" />
        )}
        <span className="text-sm font-medium text-gray-700">
          Required Documents
          {!allMet && (
            <span className="ml-2 text-xs text-orange-600 font-normal">
              {missingRequired.length} missing
            </span>
          )}
        </span>
      </div>

      <div className="space-y-2">
        {allRequired.map((doc) => {
          const isUploaded = uploaded.has(doc.name.toLowerCase());
          return (
            <div key={doc.name} className="flex items-start gap-2">
              {isUploaded ? (
                <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm ${isUploaded ? "text-gray-600 line-through" : "text-gray-800"}`}>
                  {doc.name}
                </p>
                <p className="text-xs text-gray-400">{doc.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Upload, File, X, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UploadedDoc {
  documentId: Id<"documents">;
  name: string;
}

interface DocumentUploaderProps {
  entityId: string;
  entityType: "claim" | "proposal" | "policy" | "onboarding";
  uploadedBy: Id<"users">;
  onUploaded?: (docs: UploadedDoc[]) => void;
  accept?: string;
  maxFiles?: number;
  label?: string;
}

export function DocumentUploader({
  entityId,
  entityType,
  uploadedBy,
  onUploaded,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxFiles = 10,
  label = "Upload Documents",
}: DocumentUploaderProps) {
  const { uploadFile, isUploading } = useFileUpload();
  const createDocument = useMutation(api.documents.create);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, maxFiles - uploadedDocs.length);

    const newDocs: UploadedDoc[] = [];
    for (const file of fileArray) {
      const uploaded = await uploadFile(file);
      if (!uploaded) continue;

      const docId = await createDocument({
        name: file.name,
        fileId: uploaded.storageId,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        entityId,
        entityType,
        uploadedBy,
      });

      newDocs.push({ documentId: docId, name: file.name });
      toast.success(`${file.name} uploaded`);
    }

    const all = [...uploadedDocs, ...newDocs];
    setUploadedDocs(all);
    onUploaded?.(all);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [uploadedDocs]
  );

  const removeDoc = (idx: number) => {
    const updated = uploadedDocs.filter((_, i) => i !== idx);
    setUploadedDocs(updated);
    onUploaded?.(updated);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <label
        className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          className="hidden"
          accept={accept}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={24} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">
              Drag & drop or click to browse · {accept.replace(/\./g, "").toUpperCase()}
            </p>
          </div>
        )}
      </label>

      {/* Uploaded files list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          {uploadedDocs.map((doc, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-100 rounded-lg"
            >
              <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              <File size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{doc.name}</span>
              <button
                type="button"
                onClick={() => removeDoc(idx)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

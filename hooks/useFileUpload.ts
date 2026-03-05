"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface UploadedFile {
  storageId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    try {
      setIsUploading(true);

      // Step 1: Get presigned upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Step 2: POST file directly to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) throw new Error("Upload failed");

      const { storageId } = await result.json();

      return {
        storageId,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      };
    } catch (error) {
      toast.error("File upload failed. Please try again.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}

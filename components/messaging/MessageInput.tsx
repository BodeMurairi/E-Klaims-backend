"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRole } from "@/hooks/useRole";
import { Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface MessageInputProps {
  entityId: string;
  entityType: "claim" | "proposal";
  senderId: Id<"users">;
}

export function MessageInput({ entityId, entityType, senderId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const role = useRole();
  const sendMessage = useMutation(api.messages.send);

  const canSendInternal = role && role !== "client";

  const handleSend = async () => {
    if (!content.trim()) return;
    setIsSending(true);
    try {
      await sendMessage({
        entityId,
        entityType,
        senderId,
        content: content.trim(),
        isInternal: isInternal && !!canSendInternal,
      });
      setContent("");
      setIsInternal(false);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your message..."
        rows={3}
        className="resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
        }}
      />
      <div className="flex items-center justify-between">
        {canSendInternal && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="internal"
              checked={isInternal}
              onCheckedChange={(v) => setIsInternal(!!v)}
            />
            <Label htmlFor="internal" className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
              <Lock size={10} />
              Internal note (not visible to client)
            </Label>
          </div>
        )}
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className="ml-auto flex items-center gap-2"
        >
          <Send size={14} />
          Send
        </Button>
      </div>
    </div>
  );
}

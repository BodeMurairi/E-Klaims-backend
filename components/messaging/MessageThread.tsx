"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatRelativeTime } from "@/lib/utils";
import { Lock } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRole } from "@/hooks/useRole";

interface MessageThreadProps {
  entityId: string;
  entityType: "claim" | "proposal";
}

export function MessageThread({ entityId, entityType }: MessageThreadProps) {
  const role = useRole();
  const includeInternal = role !== "client";

  const messages = useQuery(api.messages.listByEntity, {
    entityId,
    entityType,
    includeInternal: includeInternal ?? false,
  });

  if (!messages) {
    return <div className="text-sm text-gray-400 py-4 text-center">Loading messages...</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-xl">
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div
          key={msg._id}
          className={`rounded-xl p-4 ${
            msg.isInternal
              ? "bg-yellow-50 border border-yellow-100"
              : "bg-white border border-gray-100"
          }`}
        >
          {msg.isInternal && (
            <div className="flex items-center gap-1 text-xs text-yellow-600 font-medium mb-2">
              <Lock size={10} />
              Internal Note
            </div>
          )}
          <p className="text-sm text-gray-800">{msg.content}</p>
          <p className="text-xs text-gray-400 mt-2">
            {formatRelativeTime(msg.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "./useCurrentUser";
import { Id } from "@/convex/_generated/dataModel";

export function useNotifications() {
  const { convexUser } = useCurrentUser();
  const notifications = useQuery(
    api.notifications.listByUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const unread = useQuery(
    api.notifications.getUnread,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  return {
    notifications: notifications ?? [],
    unreadCount: unread?.length ?? 0,
    markRead: (id: Id<"notifications">) => markRead({ notificationId: id }),
    markAllRead: () =>
      convexUser && markAllRead({ userId: convexUser._id }),
  };
}

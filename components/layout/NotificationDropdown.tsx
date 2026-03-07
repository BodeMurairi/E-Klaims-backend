"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/utils";
import { Bell, CheckCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-gray-600" />
          <span className="font-semibold text-sm text-gray-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}
          <button onClick={onClose}>
            <X size={16} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!n.read ? "bg-blue-50/50" : ""}`}
              onClick={() => markRead(n._id)}
            >
              {n.link ? (
                <Link href={n.link} className="block" onClick={onClose}>
                  <NotificationItem notification={n} />
                </Link>
              ) : (
                <NotificationItem notification={n} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
}: {
  notification: { title: string; message: string; read: boolean; createdAt: number };
}) {
  return (
    <div>
      <div className="flex items-start gap-2">
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
        )}
        <div className={notification.read ? "pl-4" : ""}>
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

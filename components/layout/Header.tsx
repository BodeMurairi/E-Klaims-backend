"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Bell, Trash2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationDropdown } from "./NotificationDropdown";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useUser();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteUser = useMutation(api.users.deleteUser);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      // 1. Remove from Convex DB
      await deleteUser({ clerkId: user.id });
      // 2. Delete from Clerk (auto signs out)
      await user.delete();
      // 3. Redirect to home
      window.location.href = "/";
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* Delete account */}
        <div className="relative">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete account"
            className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
          >
            <Trash2 size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          </button>

          {/* Confirmation popover */}
          {showDeleteConfirm && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowDeleteConfirm(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-red-100 p-4 z-30">
                <p className="text-sm font-semibold text-gray-900 mb-1">Delete your account?</p>
                <p className="text-xs text-gray-500 mb-4">
                  This permanently removes your account and all associated data. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

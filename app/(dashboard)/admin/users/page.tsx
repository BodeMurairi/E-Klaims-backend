"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserRole } from "@/lib/types";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminUsersPage() {
  const users = useQuery(api.users.listAll);
  const updateRole = useMutation(api.users.updateRole);
  const setActive = useMutation(api.users.setActiveStatus);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: Id<"users">, role: UserRole) => {
    setUpdatingId(userId);
    try {
      await updateRole({ userId, role });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleActive = async (userId: Id<"users">, current: boolean) => {
    await setActive({ userId, isActive: !current });
    toast.success(current ? "User deactivated" : "User activated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <span className="text-sm text-gray-500">{users?.length ?? 0} users</span>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Name", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {!users ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> :
              users.map(u => (
                <tr key={u._id} className={`hover:bg-gray-50 ${!u.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.role}
                      onValueChange={(role) => handleRoleChange(u._id, role as UserRole)}
                      disabled={updatingId === u._id}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs">
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u._id, u.isActive)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

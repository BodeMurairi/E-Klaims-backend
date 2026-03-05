"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { Users, FileText, Shield, ClipboardList } from "lucide-react";

export default function AdminDashboard() {
  const users = useQuery(api.users.listAll);
  const claims = useQuery(api.claims.listAll);
  const proposals = useQuery(api.proposals.listAll);
  const policies = useQuery(api.policies.listAll);

  const roleBreakdown = users?.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={users?.length ?? 0} icon={Users} iconColor="text-blue-600" />
        <StatsCard title="Total Claims" value={claims?.length ?? 0} icon={ClipboardList} iconColor="text-purple-600" />
        <StatsCard title="Proposals" value={proposals?.length ?? 0} icon={FileText} iconColor="text-yellow-600" />
        <StatsCard title="Active Policies" value={policies?.filter(p => p.status === "active").length ?? 0} icon={Shield} iconColor="text-green-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User role breakdown */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="font-semibold text-sm text-gray-800 mb-4">Users by Role</h3>
          <div className="space-y-3">
            {Object.entries(roleBreakdown ?? {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{role.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-blue-200 rounded-full" style={{ width: `${(count / (users?.length || 1)) * 100}px` }} />
                  <span className="text-sm font-medium text-gray-800">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Claims by status */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="font-semibold text-sm text-gray-800 mb-4">Claims Pipeline</h3>
          <div className="space-y-2">
            {(["submitted", "under_review", "assessor_assigned", "approved", "paid"] as const).map(status => {
              const count = claims?.filter(c => c.status === status).length ?? 0;
              return (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{status.replace(/_/g, " ")}</span>
                  <span className="font-medium text-gray-800">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <RecentActivityFeed />
    </div>
  );
}

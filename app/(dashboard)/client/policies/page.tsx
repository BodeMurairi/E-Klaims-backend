"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Shield } from "lucide-react";
import { POLICY_STATUSES, PRODUCT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ClientPoliciesPage() {
  const { convexUser } = useCurrentUser();
  const policies = useQuery(api.policies.listByClient, convexUser ? { clientId: convexUser._id } : "skip");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Policies</h2>

      {!policies ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Shield size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No policies yet. Contact your agent to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map(policy => {
            const statusInfo = POLICY_STATUSES.find(s => s.value === policy.status);
            const product = PRODUCT_TYPES.find(p => p.value === policy.productType);
            return (
              <div key={policy._id} className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{policy.policyNumber}</p>
                    <p className="text-sm text-gray-500">{product?.label ?? policy.productType}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusInfo?.color ?? "bg-gray-100 text-gray-800")}>
                    {statusInfo?.label ?? policy.status}
                  </span>
                </div>
                {policy.notes && <p className="text-sm text-gray-600 mt-2">{policy.notes}</p>}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Sum Insured</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(policy.sumInsured)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Annual Premium</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(policy.premium)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Start Date</p>
                    <p className="text-gray-700">{formatDate(policy.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Expiry Date</p>
                    <p className="text-gray-700">{formatDate(policy.endDate)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

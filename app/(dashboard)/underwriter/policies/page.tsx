"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Shield, Eye } from "lucide-react";
import { PRODUCT_TYPES } from "@/lib/constants";
import Link from "next/link";

function ClientName({ clientId }: { clientId: Id<"users"> }) {
  const client = useQuery(api.users.getById, { id: clientId });
  return <span>{client?.name ?? "—"}</span>;
}

export default function UnderwriterPoliciesPage() {
  const { convexUser } = useCurrentUser();
  const policies = useQuery(
    api.policies.listByUnderwriter,
    convexUser ? { underwriterId: convexUser._id } : "skip"
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Approved Policies</h2>

      {!policies ? (
        <div className="text-gray-400">Loading...</div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Shield size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No approved policies yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Policy #", "Product", "Client", "Sum Insured", "Start", "End", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {policies.map((p) => {
                const product = PRODUCT_TYPES.find((t) => t.value === p.productType);
                return (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.policyNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{product?.label ?? p.productType}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <ClientName clientId={p.clientId} />
                    </td>
                    <td className="px-4 py-3">{formatCurrency(p.sumInsured)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.startDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.endDate)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium capitalize">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/underwriter/policies/${p._id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Eye size={13} />
                        Preview
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

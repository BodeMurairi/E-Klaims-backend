"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Users, UserPlus, Mail, Phone, FileText } from "lucide-react";
import Link from "next/link";
import { formatDate, formatRelativeTime } from "@/lib/utils";

function ClientRow({ clientId, proposals }: {
  clientId: Id<"users">;
  proposals: { _id: Id<"proposals">; status: string; productType: string; pendingClientConfirmation?: boolean; createdAt: number }[];
}) {
  const client = useQuery(api.users.getById, { id: clientId });

  const latestAt = Math.max(...proposals.map((p) => p.createdAt));
  const activePolicies = proposals.filter((p) => p.status === "approved").length;
  const pending = proposals.filter((p) => p.status === "pending" || p.status === "under_review").length;

  if (!client) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3 text-xs text-gray-300">Loading…</td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-800 text-sm">{client.name}</p>
        <p className="text-xs text-gray-400">{formatDate(client.createdAt)}</p>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Mail size={13} className="flex-shrink-0" /> {client.email}
        </span>
      </td>
      <td className="px-4 py-3">
        {client.phone ? (
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Phone size={13} className="flex-shrink-0" /> {client.phone}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {activePolicies > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {activePolicies} active
            </span>
          )}
          {pending > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
          {activePolicies === 0 && pending === 0 && (
            <span className="text-xs text-gray-400">{proposals.length} application{proposals.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Last: {formatRelativeTime(latestAt)}</p>
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/distributor/policies?client=${clientId}`}
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
        >
          <FileText size={12} /> View policies
        </Link>
      </td>
    </tr>
  );
}

export default function DistributorClientsPage() {
  const { convexUser } = useCurrentUser();
  const proposals = useQuery(
    api.proposals.listByDistributor,
    convexUser ? { distributorId: convexUser._id } : "skip"
  );

  const allProposals = proposals ?? [];
  const uniqueClientIds = [...new Set(allProposals.map((p) => p.clientId))] as Id<"users">[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Clients</h2>
          <p className="text-sm text-gray-500 mt-1">
            {uniqueClientIds.length} client{uniqueClientIds.length !== 1 ? "s" : ""} linked to your account
          </p>
        </div>
        <Link
          href="/distributor/onboard"
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          <UserPlus size={16} /> Onboard a Client
        </Link>
      </div>

      {!proposals ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : uniqueClientIds.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="text-center py-16">
            <Users size={44} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">No clients yet</p>
            <p className="text-sm text-gray-400 mb-5">
              Clients appear here when they link your agent code or you onboard them directly.
            </p>
            <Link
              href="/distributor/onboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
            >
              <UserPlus size={14} /> Onboard a Client
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Client", "Email", "Phone", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {uniqueClientIds.map((clientId) => (
                <ClientRow
                  key={clientId}
                  clientId={clientId}
                  proposals={allProposals.filter((p) => p.clientId === clientId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

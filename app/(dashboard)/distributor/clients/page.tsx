"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate } from "@/lib/utils";
import { Users } from "lucide-react";

export default function DistributorClientsPage() {
  const clients = useQuery(api.users.listByRole, { role: "client" });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Clients</h2>

      {!clients ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No clients registered yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Name", "Email", "Phone", "Joined"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.email}</td>
                    <td className="px-4 py-3 text-gray-500">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

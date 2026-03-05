"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClaimCard } from "@/components/claims/ClaimCard";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";

export default function ClientClaimsPage() {
  const { convexUser } = useCurrentUser();
  const claims = useQuery(api.claims.listByClient, convexUser ? { clientId: convexUser._id } : "skip");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Claims</h2>
        <Link href="/client/claims/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> File New Claim
        </Link>
      </div>

      {!claims ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <FileText size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No claims filed yet</p>
          <Link href="/client/claims/new" className="text-sm text-blue-600 hover:underline">File your first claim →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {claims.map(claim => (
            <ClaimCard key={claim._id} claim={claim} href={`/client/claims/${claim._id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

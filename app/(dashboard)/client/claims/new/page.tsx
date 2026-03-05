"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ClaimForm } from "@/components/claims/ClaimForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewClaimPage() {
  const { convexUser } = useCurrentUser();

  if (!convexUser) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/client/claims" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">File a Claim</h2>
      </div>
      <ClaimForm clientId={convexUser._id} submittedBy={convexUser._id} redirectTo="/client/claims" />
    </div>
  );
}

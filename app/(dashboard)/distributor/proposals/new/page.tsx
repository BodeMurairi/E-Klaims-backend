"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProposalPage() {
  const { convexUser } = useCurrentUser();
  if (!convexUser) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/distributor/proposals" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h2 className="text-2xl font-bold text-gray-900">New Proposal</h2>
      </div>
      <ProposalForm distributorId={convexUser._id} redirectTo="/distributor/proposals" />
    </div>
  );
}

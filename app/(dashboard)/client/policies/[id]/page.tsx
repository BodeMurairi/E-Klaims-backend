"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PolicyDocument } from "@/components/policies/PolicyDocument";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ClientPolicyDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const policy = useQuery(api.policies.getById, { id: id as Id<"policies"> });
  const client = useQuery(api.users.getById, policy?.clientId ? { id: policy.clientId } : "skip");
  const distributor = useQuery(api.users.getById, policy?.distributorId ? { id: policy.distributorId } : "skip");
  const underwriter = useQuery(api.users.getById, policy?.underwriterId ? { id: policy.underwriterId } : "skip");

  if (!policy || !client) {
    return <div className="text-gray-400 p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/client/policies" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <PolicyDocument
        policy={policy}
        clientName={client.name}
        clientEmail={client.email}
        distributorName={distributor?.name}
        underwriterName={underwriter?.name}
      />
    </div>
  );
}

"use client";

import { formatDate, formatCurrency } from "@/lib/utils";
import { PRODUCT_COVERAGE, PRODUCT_TYPES, POLICY_STATUSES } from "@/lib/constants";
import { CheckCircle2, Printer, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Policy {
  _id: string;
  policyNumber: string;
  productType: string;
  sumInsured: number;
  premium: number;
  status: string;
  startDate: number;
  endDate: number;
  notes?: string;
}

interface PolicyDocumentProps {
  policy: Policy;
  clientName: string;
  clientEmail?: string;
  distributorName?: string;
  underwriterName?: string;
}

export function PolicyDocument({
  policy,
  clientName,
  clientEmail,
  distributorName,
  underwriterName,
}: PolicyDocumentProps) {
  const coverage = PRODUCT_COVERAGE[policy.productType];
  const product = PRODUCT_TYPES.find((p) => p.value === policy.productType);
  const statusInfo = POLICY_STATUSES.find((s) => s.value === policy.status);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Action bar — hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-bold text-gray-900">Policy Document</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Print
          </Button>
          <Button
            size="sm"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600"
            onClick={() => {
              const prev = document.title;
              document.title = `Policy-${policy.policyNumber}`;
              window.print();
              document.title = prev;
            }}
          >
            <Download size={15} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Policy Document */}
      <div
        id="policy-document"
        className="bg-white rounded-xl border shadow-sm p-8 print:shadow-none print:border-none print:rounded-none print:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">E-Klaims Insurance</p>
              <p className="text-xs text-gray-400">Licensed Insurance Provider</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Policy Certificate</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{policy.policyNumber}</p>
            <span className={cn("inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1", statusInfo?.color ?? "bg-gray-100 text-gray-800")}>
              {statusInfo?.label ?? policy.status}
            </span>
          </div>
        </div>

        {/* Product type banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Type of Cover</p>
          <p className="text-base font-semibold text-blue-900 mt-0.5">{product?.label ?? policy.productType}</p>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Policyholder</p>
            <p className="font-semibold text-gray-900">{clientName}</p>
            {clientEmail && <p className="text-sm text-gray-500">{clientEmail}</p>}
          </div>
          {distributorName && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Agent / Broker</p>
              <p className="font-semibold text-gray-900">{distributorName}</p>
            </div>
          )}
          {underwriterName && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Underwritten By</p>
              <p className="font-semibold text-gray-900">{underwriterName}</p>
            </div>
          )}
        </div>

        {/* Key figures */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Sum Insured", value: formatCurrency(policy.sumInsured) },
            { label: "Annual Premium", value: formatCurrency(policy.premium) },
            { label: "Effective Date", value: formatDate(policy.startDate) },
            { label: "Expiry Date", value: formatDate(policy.endDate) },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Coverage Benefits */}
        {coverage && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
              Coverage Benefits
            </h3>
            <div className="divide-y border rounded-lg overflow-hidden">
              {coverage.benefits.map((benefit) => (
                <div key={benefit.name} className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{benefit.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Underwriter notes */}
        {policy.notes && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3 mb-6">
            <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-1">Special Conditions / Notes</p>
            <p className="text-sm text-gray-700">{policy.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 mt-2 text-xs text-gray-400 space-y-1">
          <p>
            This policy certificate confirms that the above-named policyholder is covered under the terms and
            conditions of the {product?.label ?? policy.productType} policy issued by E-Klaims Insurance.
          </p>
          <p>
            Coverage is valid from <strong>{formatDate(policy.startDate)}</strong> to{" "}
            <strong>{formatDate(policy.endDate)}</strong>. For claims, contact our 24/7 helpline or log in to your client portal.
          </p>
        </div>
      </div>
    </div>
  );
}

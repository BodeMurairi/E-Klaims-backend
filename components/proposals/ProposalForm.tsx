"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { RiskScorePanel } from "./RiskScorePanel";
import { toast } from "sonner";
import { PRODUCT_TYPES } from "@/lib/constants";
import { ChevronRight, ChevronLeft } from "lucide-react";

type Step = 1 | 2 | 3;

interface ProposalFormProps {
  distributorId: Id<"users">;
  redirectTo: string;
}

export function ProposalForm({ distributorId, redirectTo }: ProposalFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Client + product
  const [clientEmail, setClientEmail] = useState("");
  const [productType, setProductType] = useState<string>("");
  const [sumInsured, setSumInsured] = useState("");
  const [premium, setPremium] = useState("");

  // Step 1 — Risk details (motor-focused for demo)
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleValue, setVehicleValue] = useState("");
  const [make, setMake] = useState("");
  const [driverAge, setDriverAge] = useState("");

  // Step 2 — AI risk score result
  const [proposalId, setProposalId] = useState<Id<"proposals"> | null>(null);
  const [riskScore, setRiskScore] = useState<number | undefined>();
  const [riskSummary, setRiskSummary] = useState<string | undefined>();

  const clients = useQuery(api.users.listByRole, { role: "client" });
  const configuredRequirements = useQuery(api.documentRequirements.list, {
    entityType: "proposal",
  });
  const submitProposal = useMutation(api.proposals.submit);
  const runRiskScore = useAction(api.actions.aiStubs.runRiskScore);

  const matchedClient = clients?.find(c => c.email.toLowerCase() === clientEmail.toLowerCase());

  const productOptions = useMemo(() => {
    const configuredProductTypes = Array.from(
      new Set((configuredRequirements ?? []).map((req) => req.productType))
    );

    if (configuredProductTypes.length === 0) {
      return PRODUCT_TYPES.map((product) => ({
        value: product.value,
        label: product.label,
      }));
    }

    const defaultLabels = new Map<string, string>(
      PRODUCT_TYPES.map((product) => [product.value, product.label] as [string, string])
    );

    return configuredProductTypes
      .sort((a, b) => a.localeCompare(b))
      .map((productType) => ({
        value: productType,
        label:
          defaultLabels.get(productType) ??
          productType
            .split(/[_-]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
      }));
  }, [configuredRequirements]);

  const handleStep1Submit = async () => {
    if (!matchedClient || !productType || !sumInsured) { toast.error("Fill all required fields and ensure client email matches a registered client"); return; }
    setLoading(true);
    try {
      const riskData = productType === "motor"
        ? { vehicleReg, make, vehicleValue: parseFloat(vehicleValue), yearOfMfr: 2020, driverAge: parseInt(driverAge) }
        : { data: productType };

      const id = await submitProposal({
        clientId: matchedClient._id,
        distributorId,
        productType,
        riskDetails: { data: riskData },
        sumInsured: parseFloat(sumInsured),
        premium: premium ? parseFloat(premium) : undefined,
        documents: [],
      });
      setProposalId(id);

      // Run AI risk score
      const result = await runRiskScore({ proposalId: id, productType, riskDetails: riskData });
      setRiskScore(result.score);
      setRiskSummary(result.summary);

      setStep(2);
      toast.success("Proposal submitted! AI risk assessment complete.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"}`}>{s}</div>
            {s < 3 && <div className={`h-0.5 w-16 ${step > s ? "bg-brand-500" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">{step === 1 ? "Client & Risk Details" : step === 2 ? "AI Review" : "Documents"}</span>
      </div>

      {step === 1 && (
        <div className="space-y-4 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Client & Risk Details</h2>

          <div className="space-y-1.5">
            <Label>Client Email <span className="text-red-500">*</span></Label>
            <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" />
            {clientEmail && (matchedClient ? <p className="text-xs text-green-600">✓ Client found: {matchedClient.name}</p> : <p className="text-xs text-red-500">Client not found. They must register first.</p>)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Type <span className="text-red-500">*</span></Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {productOptions.map((product) => (
                    <SelectItem key={product.value} value={product.value}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sum Insured (KES) <span className="text-red-500">*</span></Label>
              <Input type="number" value={sumInsured} onChange={e => setSumInsured(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Premium (KES)</Label>
              <Input type="number" value={premium} onChange={e => setPremium(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {productType === "motor" && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Motor Risk Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Vehicle Reg</Label><Input value={vehicleReg} onChange={e => setVehicleReg(e.target.value)} placeholder="KCA 123X" /></div>
                <div className="space-y-1.5"><Label>Make & Model</Label><Input value={make} onChange={e => setMake(e.target.value)} placeholder="Toyota Corolla" /></div>
                <div className="space-y-1.5"><Label>Vehicle Value (KES)</Label><Input type="number" value={vehicleValue} onChange={e => setVehicleValue(e.target.value)} placeholder="0.00" /></div>
                <div className="space-y-1.5"><Label>Driver Age</Label><Input type="number" value={driverAge} onChange={e => setDriverAge(e.target.value)} placeholder="25" /></div>
              </div>
            </div>
          )}

          <Button className="w-full flex items-center gap-2" onClick={handleStep1Submit} disabled={loading || !matchedClient || !productType || !sumInsured}>
            {loading ? "Submitting & Analysing..." : <>Submit & Run AI Risk Score <ChevronRight size={16} /></>}
          </Button>
        </div>
      )}

      {step === 2 && proposalId && (
        <div className="space-y-4 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold">AI Risk Assessment</h2>
          <RiskScorePanel score={riskScore} summary={riskSummary} />
          <p className="text-sm text-gray-500">Proposal submitted. The underwriting team has been notified.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Add Documents <ChevronRight size={16} /></Button>
            <Button className="flex-1" onClick={() => router.push(redirectTo)}>Done</Button>
          </div>
        </div>
      )}

      {step === 3 && proposalId && (
        <div className="space-y-4 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Upload Documents</h2>
          <DocumentUploader entityId={proposalId} entityType="proposal" uploadedBy={distributorId} />
          <Button className="w-full" onClick={() => router.push(redirectTo)}>Done — View Proposals</Button>
        </div>
      )}
    </div>
  );
}

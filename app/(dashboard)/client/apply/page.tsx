"use client";

import { useState, useMemo, useDeferredValue } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import {
  CheckCircle, ChevronRight, Upload, X, FileText,
  Loader2, ArrowLeft, Shield, Tag,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplyStep = "select_policy" | "coverage_details" | "documents" | "review" | "submitted";

interface UploadedFile {
  storageId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

interface Quote {
  premium: number;
  sumInsured: number;
  rateLabel: string;
  breakdown: string[];
}

// ─── Field Config ─────────────────────────────────────────────────────────────

interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  isTextarea?: boolean;
}

const POLICY_FIELDS: Record<string, FieldConfig[]> = {
  motor: [
    { key: "coverType", label: "Cover Type", type: "select", required: true, options: ["Comprehensive Motor", "Third Party Fire & Theft", "Third Party Only"] },
    { key: "usage", label: "Vehicle Usage", type: "select", required: true, options: ["Private use", "Commercial purposes", "Agricultural Vehicle", "Motorcycle"] },
    { key: "make", label: "Vehicle Make", type: "text", required: true, placeholder: "e.g. Toyota" },
    { key: "model", label: "Vehicle Model", type: "text", required: true, placeholder: "e.g. Corolla" },
    { key: "year", label: "Year of Manufacture", type: "number", required: true, placeholder: "e.g. 2019" },
    { key: "registration", label: "Registration Number", type: "text", required: true, placeholder: "e.g. RAB 123A" },
    { key: "value", label: "Market Value (RWF)", type: "number", required: true, placeholder: "e.g. 10000000" },
  ],
  travel: [
    { key: "destination", label: "Destination Country / Countries", type: "text", required: true, placeholder: "e.g. Kenya, France, USA" },
    { key: "region", label: "Coverage Plan", type: "select", required: true, options: ["Africa / Asia", "Europe Basic", "Europe Plus", "Worldwide Basic", "Worldwide Silver", "Worldwide Gold"] },
    { key: "departure", label: "Departure Date", type: "date", required: true },
    { key: "returnDate", label: "Return Date", type: "date", required: true },
    { key: "purpose", label: "Purpose of Travel", type: "select", required: true, options: ["Business", "Leisure / Holiday", "Medical", "Education", "Other"] },
    { key: "preExisting", label: "Pre-existing Medical Conditions?", type: "select", required: true, options: ["No", "Yes"] },
    { key: "nextOfKin", label: "Next of Kin (Name & Phone)", type: "text", required: true, placeholder: "e.g. Jane Doe, +250 700 000 000" },
  ],
  health: [
    { key: "dob", label: "Date of Birth", type: "date", required: true },
    { key: "occupation", label: "Occupation", type: "text", required: true, placeholder: "e.g. Teacher, Engineer" },
    { key: "dependants", label: "People to Cover", type: "select", required: true, options: ["Just me", "2 people", "3 people", "4 people", "5 or more"] },
    { key: "preExisting", label: "Pre-existing Medical Conditions?", type: "select", required: true, options: ["No", "Yes"] },
    { key: "sumInsured", label: "Annual Sum Insured (RWF)", type: "select", required: true, options: ["5,000,000", "10,000,000", "20,000,000", "50,000,000"] },
  ],
  property: [
    { key: "address", label: "Property Address", type: "text", required: true, placeholder: "e.g. KG 15 Ave, Kigali" },
    { key: "type", label: "Property Type", type: "select", required: true, options: ["Residential", "Commercial", "Industrial"] },
    { key: "construction", label: "Construction Type", type: "select", required: true, options: ["Stone / Iron Sheet", "Brick / Tiles", "Concrete / Concrete"] },
    { key: "yearBuilt", label: "Year Built", type: "number", required: true, placeholder: "e.g. 2010" },
    { key: "contents", label: "Also Insure Contents?", type: "select", required: true, options: ["No", "Yes"] },
    { key: "value", label: "Property Rebuilding Value (RWF)", type: "number", required: true, placeholder: "e.g. 50000000" },
  ],
  life: [
    { key: "dob", label: "Date of Birth", type: "date", required: true },
    { key: "occupation", label: "Occupation", type: "text", required: true, placeholder: "e.g. Teacher, Engineer" },
    { key: "smoker", label: "Do You Smoke?", type: "select", required: true, options: ["No", "Yes"] },
    { key: "planType", label: "Plan Type", type: "select", required: true, options: ["Term Life", "Whole Life", "Endowment"] },
    { key: "sumInsured", label: "Sum Insured (RWF)", type: "select", required: true, options: ["5,000,000", "10,000,000", "30,000,000", "50,000,000"] },
    { key: "beneficiary", label: "Primary Beneficiary (Name & Relationship)", type: "text", required: true, placeholder: "e.g. Jane Doe, Spouse" },
  ],
};

const GENERIC_FIELDS: FieldConfig[] = [
  { key: "sumInsured", label: "Sum Insured (RWF)", type: "number", required: true, placeholder: "e.g. 5000000" },
  { key: "details", label: "Additional Details", type: "text", required: false, placeholder: "Describe the asset, person, or risk to be insured" },
];

// ─── Quote calculator ─────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  return Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

function parseDateDiff(dep: string, ret: string): number {
  const p = (s: string) => s.includes("-") ? new Date(s) : (() => { const [d, m, y] = s.split("/").map(Number); return new Date(y, m - 1, d); })();
  const days = Math.ceil((p(ret).getTime() - p(dep).getTime()) / 86_400_000);
  return Math.max(1, isNaN(days) ? 7 : days);
}

function calculateQuote(productType: string, answers: Record<string, string>): Quote {
  switch (productType) {
    case "motor": {
      const value = parseAmount(answers.value);
      const cover = answers.coverType ?? "Comprehensive Motor";
      const rate = cover.includes("Third Party Only") ? 0.005 : cover.includes("Fire") ? 0.03 : 0.045;
      const basicPremium = Math.max(30_000, Math.round(value * rate));
      const trainingLevy = Math.round(basicPremium * 0.005);
      const stampDuty = 5_000;
      const totalPremium = basicPremium + trainingLevy + stampDuty;
      return { sumInsured: value, premium: totalPremium, rateLabel: `${(rate * 100).toFixed(1)}% of vehicle value`, breakdown: [`Sum Insured: RWF ${value.toLocaleString()}`, `Basic Premium (${(rate * 100).toFixed(1)}%): RWF ${basicPremium.toLocaleString()}`, `Training Levy (0.5%): RWF ${trainingLevy.toLocaleString()}`, `Stamp Duty: RWF ${stampDuty.toLocaleString()}`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "travel": {
      const days = parseDateDiff(answers.departure, answers.returnDate);
      const USD_TO_RWF = 1350;
      const RATES: [number, number, number, number, number, number, number][] = [[8,24.54,24.54,26.85,29.03,33.05,33.58],[14,25.80,25.80,28.80,29.97,34.27,34.78],[21,27.70,27.70,33.18,34.44,37.43,38.05],[32,35.28,35.28,39.53,42.31,52.83,53.81],[49,41.60,41.60,52.15,58.41,70.09,71.41],[62,52.15,52.15,60.57,66.36,79.92,81.46],[92,60.14,60.14,77.74,84.54,94.81,96.67],[180,79.56,79.56,111.16,131.11,160.28,163.59]];
      const RIDX: Record<string, number> = { "Africa / Asia": 1, "Europe Basic": 2, "Europe Plus": 3, "Worldwide Basic": 4, "Worldwide Silver": 5, "Worldwide Gold": 6 };
      const col = RIDX[answers.region] ?? 1;
      const bracket = RATES.find(([max]) => days <= max) ?? RATES[RATES.length - 1];
      const basePremium = Math.round(bracket[col] * USD_TO_RWF);
      const totalPremium = basePremium + 2_000 + 3_000;
      const coverage = (answers.region?.startsWith("Worldwide") ? 100_000 : 30_000) * USD_TO_RWF;
      return { sumInsured: coverage, premium: totalPremium, rateLabel: answers.region, breakdown: [`Destination: ${answers.destination}`, `Plan: ${answers.region}`, `Duration: ${days} day${days !== 1 ? "s" : ""}`, `Medical Cover: RWF ${coverage.toLocaleString()}`, `Base Premium: RWF ${basePremium.toLocaleString()}`, `Admin Fee: RWF 2,000`, `Stamp Duty: RWF 3,000`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "health": {
      const si = parseAmount(answers.sumInsured);
      const dep = answers.dependants?.includes("Just") ? 1 : answers.dependants?.includes("more") ? 5 : parseAmount(answers.dependants) || 1;
      const rate = 0.04 + (dep > 1 ? (dep - 1) * 0.015 : 0);
      const basicPremium = Math.max(80_000, Math.round(si * rate));
      const totalPremium = basicPremium + Math.round(basicPremium * 0.03) + 3_000;
      return { sumInsured: si, premium: totalPremium, rateLabel: `${(rate * 100).toFixed(1)}% of sum insured`, breakdown: [`Sum Insured: RWF ${si.toLocaleString()}`, `Lives Covered: ${dep}`, `Basic Premium: RWF ${basicPremium.toLocaleString()}`, `Admin Fee (3%): RWF ${Math.round(basicPremium * 0.03).toLocaleString()}`, `Stamp Duty: RWF 3,000`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "property": {
      const value = parseAmount(answers.value);
      const hasContents = answers.contents === "Yes";
      const bPrem = Math.round(value * 0.0035);
      const cPrem = hasContents ? Math.round(value * 0.005) : 0;
      const totalPremium = Math.max(50_000, bPrem + cPrem) + 5_000;
      return { sumInsured: value, premium: totalPremium, rateLabel: `0.35% buildings${hasContents ? " + 0.5% contents" : ""}`, breakdown: [`Sum Insured: RWF ${value.toLocaleString()}`, `Building Premium: RWF ${bPrem.toLocaleString()}`, ...(hasContents ? [`Contents Premium: RWF ${cPrem.toLocaleString()}`] : []), `Stamp Duty: RWF 5,000`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "life": {
      const si = parseAmount(answers.sumInsured);
      const smoker = answers.smoker === "Yes";
      const rate = smoker ? 0.025 : 0.015;
      const basicPremium = Math.max(50_000, Math.round(si * rate));
      const totalPremium = basicPremium + Math.round(basicPremium * 0.03) + 3_000;
      return { sumInsured: si, premium: totalPremium, rateLabel: `${(rate * 100).toFixed(1)}% of sum insured${smoker ? " (smoker loading)" : ""}`, breakdown: [`Sum Insured: RWF ${si.toLocaleString()}`, `Basic Premium: RWF ${basicPremium.toLocaleString()}`, ...(smoker ? ["Smoker Loading: included"] : []), `Admin Fee (3%): RWF ${Math.round(basicPremium * 0.03).toLocaleString()}`, `Stamp Duty: RWF 3,000`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    default: {
      const si = parseAmount(answers.sumInsured ?? "0");
      const premium = Math.max(10_000, Math.round(si * 0.03));
      return { sumInsured: si, premium, rateLabel: "Standard rate (3%)", breakdown: [`Sum Insured: RWF ${si.toLocaleString()}`, `TOTAL PREMIUM: RWF ${premium.toLocaleString()}`] };
    }
  }
}

function formatPolicyLabel(productType: string, displayName?: string): string {
  if (displayName) return displayName;
  const BUILT_IN: Record<string, string> = { motor: "Motor Insurance", health: "Health Insurance", property: "Property Insurance", life: "Life Insurance", travel: "Travel Insurance" };
  return BUILT_IN[productType] ?? productType.split(/[_-]+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const { user } = useUser();
  const { convexUser } = useCurrentUser();
  const [step, setStep] = useState<ApplyStep>("select_policy");
  const [isLoading, setIsLoading] = useState(false);

  // Policy selection
  const [selectedProductType, setSelectedProductType] = useState("");
  const [selectedDisplayName, setSelectedDisplayName] = useState("");

  // Coverage details
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);

  // Document upload
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());

  // Agent link
  const [agentUsername, setAgentUsername] = useState("");
  const deferredAgent = useDeferredValue(agentUsername);
  const agentLookup = useQuery(api.users.getByUsername, deferredAgent.trim().length >= 3 ? { username: deferredAgent.trim() } : "skip");
  const agentValid = deferredAgent.trim().length >= 3 && !!agentLookup && agentLookup.role === "distributor";
  const agentInvalid = deferredAgent.trim().length >= 3 && agentLookup !== undefined && !agentValid;

  const submitFromOnboarding = useMutation(api.proposals.submitFromOnboarding);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  // Load available policies from admin config
  const allRequirements = useQuery(api.documentRequirements.list, { entityType: "proposal" });

  // Load document requirements for selected policy
  const selectedPolicyDocs = useQuery(
    api.documentRequirements.getForProduct,
    selectedProductType ? { productType: selectedProductType, entityType: "proposal" } : "skip"
  );

  const clerkEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";

  // Derive unique available policies
  const availablePolicies = useMemo(() => {
    if (!allRequirements) return [];
    const seen = new Set<string>();
    return allRequirements.reduce<Array<{ productType: string; displayName?: string; description?: string }>>((acc, req) => {
      if (!seen.has(req.productType)) {
        seen.add(req.productType);
        acc.push({ productType: req.productType, displayName: (req as any).displayName, description: (req as any).policyDescription });
      }
      return acc;
    }, []);
  }, [allRequirements]);

  // Field config for selected policy — prefer admin-configured questions
  const fields = useMemo<FieldConfig[]>(() => {
    const adminQuestions = (selectedPolicyDocs?.[0] as any)?.coverageQuestions as any[] | undefined;
    if (adminQuestions && adminQuestions.length > 0) {
      return adminQuestions.map((q: any) => ({
        key: q.key,
        label: q.label,
        type: (q.fieldType === "textarea" ? "text" : q.fieldType) as FieldConfig["type"],
        options: q.options,
        required: q.required,
        placeholder: q.placeholder,
        isTextarea: q.fieldType === "textarea",
      }));
    }
    return POLICY_FIELDS[selectedProductType] ?? GENERIC_FIELDS;
  }, [selectedPolicyDocs, selectedProductType]);

  // Steps
  const STEPS: ApplyStep[] = ["select_policy", "coverage_details", "documents", "review", "submitted"];
  const STEP_LABELS = ["Policy", "Details", "Documents", "Review", "Done"];
  const stepIdx = STEPS.indexOf(step);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectPolicy = (productType: string, displayName?: string) => {
    setSelectedProductType(productType);
    setSelectedDisplayName(formatPolicyLabel(productType, displayName));
    setAnswers({});
    setQuote(null);
    setUploadedFiles([]);
    setStep("coverage_details");
  };

  const handleCoverageNext = () => {
    const required = fields.filter((f) => f.required);
    const missing = required.filter((f) => !answers[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    const q = calculateQuote(selectedProductType, answers);
    setQuote(q);
    setStep("documents");
  };

  const handleFileUpload = async (file: File, docName: string) => {
    const contentType = file.type || "application/octet-stream";
    setUploadingDocs((p) => new Set(p).add(docName));
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": contentType }, body: file });
      if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
      const { storageId } = await res.json();
      setUploadedFiles((p) => [...p.filter((f) => f.name !== docName), { storageId, name: docName, mimeType: contentType, sizeBytes: file.size }]);
      toast.success(`${docName} uploaded.`);
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : "Please try again."}`);
    } finally {
      setUploadingDocs((p) => { const n = new Set(p); n.delete(docName); return n; });
    }
  };

  const handleDocumentsNext = () => {
    const docs = selectedPolicyDocs?.[0]?.requiredDocuments ?? [];
    const missing = docs.filter((d) => d.required && !uploadedFiles.find((f) => f.name === d.name));
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.map((d) => d.name).join(", ")}`);
      return;
    }
    setStep("review");
  };

  const handleSubmit = async () => {
    if (!user || !convexUser) return;
    if (agentInvalid) { toast.error("Invalid agent username. Clear it or use a valid agent."); return; }
    setIsLoading(true);
    try {
      await submitFromOnboarding({
        clerkId: user.id,
        name: convexUser.name,
        email: clerkEmail,
        phone: convexUser.phone,
        productType: selectedProductType,
        sumInsured: quote?.sumInsured ?? 0,
        riskDetails: { data: answers },
        agentUsername: agentUsername.trim() || undefined,
        uploadedFiles,
      });
      toast.success("Application submitted successfully!");
      setStep("submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/client" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Apply for Insurance</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose a policy and fill in your details to get started</p>
        </div>
      </div>

      {/* Progress */}
      {step !== "submitted" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < stepIdx ? "bg-brand-500 text-white" : i === stepIdx ? "bg-brand-500 text-white ring-4 ring-brand-50" : "bg-gray-100 text-gray-400"}`}>
                  {i < stepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === stepIdx ? "text-brand-500 font-medium" : "text-gray-400"}`}>{label}</span>
                {i < STEP_LABELS.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1">
            <div className="bg-brand-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">

        {/* ── Step 1: Select Policy ── */}
        {step === "select_policy" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900">Select a Policy</h3>
              <p className="text-sm text-gray-500 mt-0.5">Choose the type of insurance you want to apply for.</p>
            </div>

            {!allRequirements ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading available policies…
              </div>
            ) : availablePolicies.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No policies available yet</p>
                <p className="text-gray-400 text-xs mt-1">An administrator needs to configure policies before you can apply.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availablePolicies.map((policy) => (
                  <button
                    key={policy.productType}
                    onClick={() => handleSelectPolicy(policy.productType, policy.displayName)}
                    className="text-left p-5 rounded-xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500 transition-colors">
                        <Shield className="w-4 h-4 text-brand-500 group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">
                          {formatPolicyLabel(policy.productType, policy.displayName)}
                        </p>
                        {policy.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{policy.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-brand-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Apply now <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Coverage Details ── */}
        {step === "coverage_details" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900">Coverage Details</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Tell us about the <span className="font-medium text-brand-500">{selectedDisplayName}</span> you want to insure.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.key} className={field.isTextarea || (field.type === "text" && field.key === "details") ? "sm:col-span-2" : ""}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <select
                      value={answers[field.key] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="">— Select —</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.isTextarea ? (
                    <textarea
                      rows={3}
                      value={answers[field.key] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={answers[field.key] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep("select_policy")} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
                ← Back
              </button>
              <button onClick={handleCoverageNext} className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 text-sm flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Documents ── */}
        {step === "documents" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900">Upload Documents</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Required for your <span className="font-medium text-brand-500">{selectedDisplayName}</span> application.
              </p>
            </div>

            {/* Quote summary */}
            {quote && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Your Estimated Quote</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {quote.breakdown.map((line, i) => {
                    const isTotal = i === quote.breakdown.length - 1;
                    const [label, value] = line.split(": ");
                    return (
                      <div key={i} className={`flex gap-2 text-sm ${isTotal ? "font-bold text-green-700 w-full pt-2 mt-1 border-t border-green-200" : "text-gray-600"}`}>
                        <span>{label}:</span><span className="font-medium">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document uploads */}
            {!selectedPolicyDocs ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading document requirements…
              </div>
            ) : (selectedPolicyDocs[0]?.requiredDocuments ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No documents required for this policy.</p>
            ) : (
              <div className="space-y-3">
                {(selectedPolicyDocs[0]?.requiredDocuments ?? []).map((doc) => {
                  const uploaded = uploadedFiles.find((f) => f.name === doc.name);
                  const isUploading = uploadingDocs.has(doc.name);
                  return (
                    <div key={doc.name} className={`border rounded-xl p-4 transition-colors ${uploaded ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${uploaded ? "text-green-500" : "text-gray-400"}`} />
                          <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                          {doc.required
                            ? <span className="text-xs text-red-500 font-medium">Required</span>
                            : <span className="text-xs text-gray-400">Optional</span>}
                        </div>
                        {uploaded && !isUploading && (
                          <button onClick={() => setUploadedFiles((p) => p.filter((f) => f.name !== doc.name))} className="text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {doc.description && <p className="text-xs text-gray-400 mb-2 ml-6">{doc.description}</p>}
                      {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-brand-500 bg-brand-50 rounded-lg px-3 py-2 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                        </div>
                      )}
                      {!isUploading && uploaded && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-lg px-3 py-2 mt-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="truncate">{uploaded.name}</span>
                          <span className="text-green-500 text-xs ml-auto">{(uploaded.sizeBytes / 1024).toFixed(0)} KB</span>
                        </div>
                      )}
                      {!isUploading && !uploaded && (
                        <label className="flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-lg p-4 mt-2 hover:border-brand-500 hover:bg-brand-50 transition-colors text-center">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to select file</span>
                          <input type="file" className="hidden" accept="image/*,application/pdf"
                            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) handleFileUpload(file, doc.name); }} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep("coverage_details")} disabled={uploadingDocs.size > 0} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm disabled:opacity-50">← Back</button>
              <button onClick={handleDocumentsNext} disabled={uploadingDocs.size > 0 || !selectedPolicyDocs} className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {uploadingDocs.size > 0 ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <>Continue <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === "review" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900">Review Your Application</h3>
              <p className="text-sm text-gray-500 mt-0.5">Confirm all details before submitting.</p>
            </div>

            <div className="space-y-4">
              {/* Policy */}
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Policy Selected</p>
                <p className="font-medium text-gray-800">{selectedDisplayName}</p>
              </div>

              {/* Profile */}
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Profile</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> <span className="font-medium">{convexUser?.name}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="font-medium">{clerkEmail}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{convexUser?.phone ?? "—"}</span></div>
                </div>
              </div>

              {/* Coverage details */}
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Coverage Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {fields.map((f) => answers[f.key] ? (
                    <div key={f.key}><span className="text-gray-500">{f.label}:</span> <span className="font-medium ml-1">{answers[f.key]}</span></div>
                  ) : null)}
                </div>
              </div>

              {/* Quote */}
              {quote && (
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Estimated Quote</p>
                  <div className="space-y-1">
                    {quote.breakdown.map((line, i) => {
                      const isTotal = i === quote.breakdown.length - 1;
                      const parts = line.split(": ");
                      return (
                        <div key={i} className={`flex justify-between text-sm ${isTotal ? "font-bold text-brand-500 pt-2 mt-1 border-t" : "text-gray-600"}`}>
                          {parts.length === 2 ? <><span>{parts[0]}:</span><span className="font-medium">{parts[1]}</span></> : <span>{line}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Uploaded Documents</p>
                {uploadedFiles.length === 0 ? (
                  <p className="text-sm text-gray-400">No documents uploaded.</p>
                ) : (
                  <ul className="space-y-1">
                    {uploadedFiles.map((f) => (
                      <li key={f.name} className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" /> {f.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Agent link */}
              <div className="rounded-xl border p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Link an Agent <span className="text-gray-300 font-normal">(optional)</span></p>
                <p className="text-xs text-gray-400">Enter your agent&apos;s username to link them to this application.</p>
                <div className={`flex items-center border rounded-lg overflow-hidden focus-within:ring-2 ${agentInvalid ? "border-red-300 focus-within:ring-red-300" : agentValid ? "border-green-300 focus-within:ring-green-300" : "focus-within:ring-brand-500"}`}>
                  <span className="px-3 py-2 bg-gray-50 text-gray-400 border-r text-sm">@</span>
                  <input type="text" value={agentUsername} onChange={(e) => setAgentUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="agent_username" className="flex-1 px-3 py-2 text-sm focus:outline-none" />
                </div>
                {agentValid && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Agent found: {agentLookup!.name}</p>}
                {agentInvalid && <p className="text-xs text-red-500">No agent found with that username.</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep("documents")} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">← Back</button>
              <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Application"}
              </button>
            </div>
          </div>
        )}

        {/* ── Submitted ── */}
        {step === "submitted" && (
          <div className="space-y-6 text-center py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Application Submitted!</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Your <strong>{selectedDisplayName}</strong> application is now under review. An underwriter will assess it shortly.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link href="/client" className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 text-sm flex items-center gap-2">
                Go to Dashboard <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/client/apply" onClick={() => { setStep("select_policy"); setSelectedProductType(""); setAnswers({}); setQuote(null); setUploadedFiles([]); }} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Apply Again
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_TYPES } from "@/lib/constants";
import { Plus, Trash2, Save, Pencil, ShieldCheck, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type RequirementEntityType = "claim" | "proposal" | "onboarding";
type FieldType = "text" | "number" | "select" | "date" | "textarea";

interface RequiredDoc {
  name: string;
  description: string;
  required: boolean;
}

interface CoverageQuestion {
  key: string;
  label: string;
  fieldType: FieldType;
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface RequirementRow {
  _id: Id<"documentRequirements">;
  productType: string;
  entityType: RequirementEntityType;
  requiredDocuments: RequiredDoc[];
  coverageQuestions?: CoverageQuestion[];
  displayName?: string;
  policyDescription?: string;
}

interface GroupedPolicyRequirements {
  productType: string;
  proposal?: RequirementRow;
  claim?: RequirementRow;
  onboarding?: RequirementRow;
}

const DEFAULT_DOC: RequiredDoc = { name: "", description: "", required: true };
const DEFAULT_QUESTION: CoverageQuestion = {
  key: "",
  label: "",
  fieldType: "text",
  required: true,
  placeholder: "",
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  number: "Number",
  select: "Dropdown (select)",
  date: "Date",
  textarea: "Long text",
};

const BUILT_IN_POLICY_LABELS = new Map<string, string>(
  PRODUCT_TYPES.map((product) => [product.value, product.label] as [string, string])
);

function toPolicyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toQuestionKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatPolicyLabel(productType: string): string {
  return (
    BUILT_IN_POLICY_LABELS.get(productType) ??
    productType
      .split(/[_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function sanitizeDocs(docs: RequiredDoc[]): RequiredDoc[] {
  return docs
    .map((doc) => ({
      name: doc.name.trim(),
      description: doc.description.trim(),
      required: doc.required,
    }))
    .filter((doc) => doc.name.length > 0)
    .map((doc) => ({
      ...doc,
      description: doc.description || "Required supporting document",
    }));
}

function sanitizeQuestions(questions: CoverageQuestion[]): CoverageQuestion[] {
  return questions
    .map((q) => ({
      ...q,
      key: q.key.trim() || toQuestionKey(q.label),
      label: q.label.trim(),
      placeholder: q.placeholder?.trim() || undefined,
      options:
        q.fieldType === "select" && q.options
          ? q.options.map((o) => o.trim()).filter((o) => o.length > 0)
          : undefined,
    }))
    .filter((q) => q.label.length > 0 && q.key.length > 0);
}

function cloneDocs(docs: RequiredDoc[] | undefined): RequiredDoc[] {
  if (!docs || docs.length === 0) return [{ ...DEFAULT_DOC }];
  return docs.map((doc) => ({
    name: doc.name,
    description: doc.description,
    required: doc.required,
  }));
}

function cloneQuestions(questions: CoverageQuestion[] | undefined): CoverageQuestion[] {
  if (!questions || questions.length === 0) return [{ ...DEFAULT_QUESTION }];
  return questions.map((q) => ({
    key: q.key,
    label: q.label,
    fieldType: q.fieldType,
    required: q.required,
    placeholder: q.placeholder ?? "",
    options: q.options ? [...q.options] : undefined,
  }));
}

export default function DocumentRequirementsPage() {
  const { convexUser } = useCurrentUser();
  const rawRequirements = useQuery(api.documentRequirements.list, {});
  const requirements = rawRequirements as RequirementRow[] | undefined;
  const createReq = useMutation(api.documentRequirements.create);
  const updateReq = useMutation(api.documentRequirements.update);
  const removeReq = useMutation(api.documentRequirements.remove);

  const [policyInput, setPolicyInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [policyDescription, setPolicyDescription] = useState("");
  const [applicationDocs, setApplicationDocs] = useState<RequiredDoc[]>([
    { ...DEFAULT_DOC },
  ]);
  const [claimDocs, setClaimDocs] = useState<RequiredDoc[]>([{ ...DEFAULT_DOC }]);
  const [coverageQuestions, setCoverageQuestions] = useState<CoverageQuestion[]>([
    { ...DEFAULT_QUESTION },
  ]);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [busyPolicy, setBusyPolicy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const groupedPolicies = useMemo(() => {
    if (!requirements) return [];
    const grouped = new Map<string, GroupedPolicyRequirements>();

    requirements.forEach((req) => {
      const existing =
        grouped.get(req.productType) ??
        ({
          productType: req.productType,
        } as GroupedPolicyRequirements);

      if (req.entityType === "proposal") existing.proposal = req;
      if (req.entityType === "claim") existing.claim = req;
      if (req.entityType === "onboarding") existing.onboarding = req;

      grouped.set(req.productType, existing);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.productType.localeCompare(b.productType)
    );
  }, [requirements]);

  // --- Document helpers ---
  const updateDoc = (
    section: "application" | "claim",
    index: number,
    field: keyof RequiredDoc,
    value: string | boolean
  ) => {
    const setter = section === "application" ? setApplicationDocs : setClaimDocs;
    setter((current) =>
      current.map((doc, idx) =>
        idx === index ? { ...doc, [field]: value } : doc
      )
    );
  };

  const addDoc = (section: "application" | "claim") => {
    const setter = section === "application" ? setApplicationDocs : setClaimDocs;
    setter((current) => [...current, { ...DEFAULT_DOC }]);
  };

  const removeDoc = (section: "application" | "claim", index: number) => {
    const setter = section === "application" ? setApplicationDocs : setClaimDocs;
    setter((current) => current.filter((_, idx) => idx !== index));
  };

  // --- Coverage question helpers ---
  const updateQuestion = (
    index: number,
    field: keyof CoverageQuestion,
    value: string | boolean | string[]
  ) => {
    setCoverageQuestions((current) =>
      current.map((q, idx) => {
        if (idx !== index) return q;
        const updated = { ...q, [field]: value };
        // Auto-generate key from label if key hasn't been manually set
        if (field === "label" && typeof value === "string") {
          const autoKey = toQuestionKey(value);
          if (!q.key || q.key === toQuestionKey(q.label)) {
            updated.key = autoKey;
          }
        }
        return updated;
      })
    );
  };

  const updateQuestionOptions = (index: number, optionsRaw: string) => {
    // Store as comma-separated string in editing, convert on save
    setCoverageQuestions((current) =>
      current.map((q, idx) =>
        idx === index
          ? { ...q, options: optionsRaw.split(",").map((o) => o.trim()) }
          : q
      )
    );
  };

  const addQuestion = () => {
    setCoverageQuestions((current) => [...current, { ...DEFAULT_QUESTION }]);
  };

  const removeQuestion = (index: number) => {
    setCoverageQuestions((current) => current.filter((_, idx) => idx !== index));
  };

  // --- Save ---
  const handleSave = async () => {
    if (!convexUser) {
      toast.error("User not loaded");
      return;
    }

    const productType = toPolicyKey(policyInput);
    const validApplicationDocs = sanitizeDocs(applicationDocs);
    const validClaimDocs = sanitizeDocs(claimDocs);
    const validQuestions = sanitizeQuestions(coverageQuestions);

    if (!productType) {
      toast.error("Policy name is required");
      return;
    }
    if (validApplicationDocs.length === 0) {
      toast.error("Add at least one application document");
      return;
    }
    if (validClaimDocs.length === 0) {
      toast.error("Add at least one claim document");
      return;
    }

    const existing = groupedPolicies.find(
      (policy) => policy.productType === productType
    );

    setSaving(true);
    try {
      if (existing?.proposal) {
        await updateReq({
          id: existing.proposal._id,
          displayName: displayName.trim() || undefined,
          policyDescription: policyDescription.trim() || undefined,
          requiredDocuments: validApplicationDocs,
          coverageQuestions: validQuestions.length > 0 ? validQuestions : undefined,
        });
      } else {
        await createReq({
          productType,
          displayName: displayName.trim() || undefined,
          policyDescription: policyDescription.trim() || undefined,
          entityType: "proposal",
          requiredDocuments: validApplicationDocs,
          coverageQuestions: validQuestions.length > 0 ? validQuestions : undefined,
          createdBy: convexUser._id,
        });
      }

      if (existing?.claim) {
        await updateReq({
          id: existing.claim._id,
          displayName: displayName.trim() || undefined,
          policyDescription: policyDescription.trim() || undefined,
          requiredDocuments: validClaimDocs,
        });
      } else {
        await createReq({
          productType,
          displayName: displayName.trim() || undefined,
          policyDescription: policyDescription.trim() || undefined,
          entityType: "claim",
          requiredDocuments: validClaimDocs,
          createdBy: convexUser._id,
        });
      }

      toast.success(
        existing ? "Policy requirements updated" : "Policy requirements saved"
      );

      setPolicyInput("");
      setDisplayName("");
      setPolicyDescription("");
      setApplicationDocs([{ ...DEFAULT_DOC }]);
      setClaimDocs([{ ...DEFAULT_DOC }]);
      setCoverageQuestions([{ ...DEFAULT_QUESTION }]);
      setEditingPolicy(null);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (policy: GroupedPolicyRequirements) => {
    setPolicyInput(policy.productType);
    setDisplayName((policy.proposal as any)?.displayName ?? "");
    setPolicyDescription((policy.proposal as any)?.policyDescription ?? "");
    setApplicationDocs(cloneDocs(policy.proposal?.requiredDocuments));
    setClaimDocs(cloneDocs(policy.claim?.requiredDocuments));
    setCoverageQuestions(cloneQuestions((policy.proposal as any)?.coverageQuestions));
    setEditingPolicy(policy.productType);
  };

  const handleDeletePolicy = async (policyType: string) => {
    if (!requirements) return;

    const shouldDelete = window.confirm(
      `Delete all document requirements for "${formatPolicyLabel(policyType)}"?`
    );
    if (!shouldDelete) return;

    const ids = requirements
      .filter((req) => req.productType === policyType)
      .map((req) => req._id);
    if (ids.length === 0) return;

    setBusyPolicy(policyType);
    try {
      await Promise.all(ids.map((id) => removeReq({ id })));
      toast.success("Policy requirements deleted");
      if (editingPolicy === policyType) {
        setEditingPolicy(null);
        setPolicyInput("");
        setDisplayName("");
        setPolicyDescription("");
        setApplicationDocs([{ ...DEFAULT_DOC }]);
        setClaimDocs([{ ...DEFAULT_DOC }]);
        setCoverageQuestions([{ ...DEFAULT_QUESTION }]);
      }
    } catch {
      toast.error("Failed to delete policy requirements");
    } finally {
      setBusyPolicy(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Supported Policies Setup
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure each supported policy, define the coverage detail questions, and set required documents for applications and claims.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-6">
        {/* Policy key + display info */}
        <div className="space-y-1.5">
          <Label>Policy Key</Label>
          <Input
            value={policyInput}
            onChange={(event) => setPolicyInput(event.target.value)}
            placeholder="e.g. motor, travel, crop_insurance"
          />
          <p className="text-xs text-gray-400">
            Stored key:{" "}
            <span className="font-mono">
              {toPolicyKey(policyInput) || "policy_key"}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Display Name <span className="text-gray-400 font-normal">(shown to clients)</span></Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Motor Insurance"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Policy Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              value={policyDescription}
              onChange={(e) => setPolicyDescription(e.target.value)}
              placeholder="Brief description shown to clients on the application form"
            />
          </div>
        </div>

        {/* Coverage Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Coverage Detail Questions</Label>
              <p className="text-xs text-gray-400 mt-0.5">
                These are the questions shown to clients in Step 2 (Details) when applying for this policy.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={addQuestion}
              className="flex items-center gap-1 shrink-0"
            >
              <Plus size={13} />
              Add Question
            </Button>
          </div>

          <div className="space-y-3">
            {coverageQuestions.map((q, index) => (
              <div key={`cq-${index}`} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Question label</p>
                    <Input
                      placeholder="e.g. Vehicle Make"
                      value={q.label}
                      onChange={(e) => updateQuestion(index, "label", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Field key (auto)</p>
                    <Input
                      placeholder="e.g. vehicle_make"
                      value={q.key}
                      onChange={(e) => updateQuestion(index, "key", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Field type</p>
                    <Select
                      value={q.fieldType}
                      onValueChange={(val) => updateQuestion(index, "fieldType", val as FieldType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Placeholder text (optional)</p>
                    <Input
                      placeholder="e.g. e.g. Toyota"
                      value={q.placeholder ?? ""}
                      onChange={(e) => updateQuestion(index, "placeholder", e.target.value)}
                    />
                  </div>
                  {q.fieldType === "select" && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Options (comma-separated)</p>
                      <Input
                        placeholder="e.g. Option A, Option B, Option C"
                        value={(q.options ?? []).join(", ")}
                        onChange={(e) => updateQuestionOptions(index, e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <Checkbox
                      checked={q.required}
                      onCheckedChange={(value) => updateQuestion(index, "required", !!value)}
                    />
                    Required
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQuestion(index)}
                    disabled={coverageQuestions.length === 1}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Application Documents</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addDoc("application")}
                className="flex items-center gap-1"
              >
                <Plus size={13} />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {applicationDocs.map((doc, index) => (
                <div key={`app-doc-${index}`} className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Document name"
                      value={doc.name}
                      onChange={(event) =>
                        updateDoc("application", index, "name", event.target.value)
                      }
                    />
                    <Input
                      placeholder="Description"
                      value={doc.description}
                      onChange={(event) =>
                        updateDoc("application", index, "description", event.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      <Checkbox
                        checked={doc.required}
                        onCheckedChange={(value) =>
                          updateDoc("application", index, "required", !!value)
                        }
                      />
                      Required
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDoc("application", index)}
                      disabled={applicationDocs.length === 1}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Claim Documents</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addDoc("claim")}
                className="flex items-center gap-1"
              >
                <Plus size={13} />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {claimDocs.map((doc, index) => (
                <div
                  key={`claim-doc-${index}`}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Document name"
                      value={doc.name}
                      onChange={(event) =>
                        updateDoc("claim", index, "name", event.target.value)
                      }
                    />
                    <Input
                      placeholder="Description"
                      value={doc.description}
                      onChange={(event) =>
                        updateDoc("claim", index, "description", event.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      <Checkbox
                        checked={doc.required}
                        onCheckedChange={(value) =>
                          updateDoc("claim", index, "required", !!value)
                        }
                      />
                      Required
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDoc("claim", index)}
                      disabled={claimDocs.length === 1}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save size={14} />
          {saving
            ? "Saving..."
            : editingPolicy
              ? "Update Policy Requirements"
              : "Save Policy Requirements"}
        </Button>
      </div>

      {/* Configured policies list */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Configured Policies</h3>

        {!requirements ? (
          <div className="text-gray-400">Loading...</div>
        ) : groupedPolicies.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
            No policies configured yet.
          </div>
        ) : (
          groupedPolicies.map((policy) => {
            const coverageQs = (policy.proposal as any)?.coverageQuestions as
              | CoverageQuestion[]
              | undefined;
            const policyDisplayName =
              (policy.proposal as any)?.displayName || formatPolicyLabel(policy.productType);

            return (
              <div key={policy.productType} className="bg-white rounded-xl border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-brand-500" />
                    <div>
                      <p className="font-medium text-gray-800">{policyDisplayName}</p>
                      <p className="text-xs text-gray-400 font-mono">{policy.productType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(policy)}
                      className="flex items-center gap-1"
                    >
                      <Pencil size={13} />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePolicy(policy.productType)}
                      disabled={busyPolicy === policy.productType}
                      className="flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      {busyPolicy === policy.productType ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>

                {/* Coverage questions summary */}
                {coverageQs && coverageQs.length > 0 && (
                  <div className="rounded-lg border p-3 bg-brand-50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ListChecks size={13} className="text-brand-500" />
                      <p className="text-xs uppercase tracking-wide text-brand-600 font-medium">
                        Coverage Questions ({coverageQs.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {coverageQs.map((q) => (
                        <span
                          key={q.key}
                          className="inline-flex items-center gap-1 text-xs bg-white border border-brand-200 text-gray-700 rounded px-2 py-0.5"
                        >
                          {q.label}
                          <span className="text-gray-400">({q.fieldType})</span>
                          {!q.required && (
                            <span className="text-gray-400 italic">opt</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                      Application Documents
                    </p>
                    {!policy.proposal || policy.proposal.requiredDocuments.length === 0 ? (
                      <p className="text-sm text-gray-400">None configured</p>
                    ) : (
                      <div className="space-y-1">
                        {policy.proposal.requiredDocuments.map((doc) => (
                          <p key={`proposal-${doc.name}`} className="text-sm text-gray-700">
                            {doc.name}
                            {!doc.required ? (
                              <span className="text-xs text-gray-400"> (optional)</span>
                            ) : null}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                      Claim Documents
                    </p>
                    {!policy.claim || policy.claim.requiredDocuments.length === 0 ? (
                      <p className="text-sm text-gray-400">None configured</p>
                    ) : (
                      <div className="space-y-1">
                        {policy.claim.requiredDocuments.map((doc) => (
                          <p key={`claim-${doc.name}`} className="text-sm text-gray-700">
                            {doc.name}
                            {!doc.required ? (
                              <span className="text-xs text-gray-400"> (optional)</span>
                            ) : null}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

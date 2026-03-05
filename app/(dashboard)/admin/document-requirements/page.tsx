"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PRODUCT_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RequiredDoc { name: string; description: string; required: boolean }

export default function DocumentRequirementsPage() {
  const { convexUser } = useCurrentUser();
  const requirements = useQuery(api.documentRequirements.list, {});
  const createReq = useMutation(api.documentRequirements.create);
  const removeReq = useMutation(api.documentRequirements.remove);

  const [productType, setProductType] = useState("motor");
  const [entityType, setEntityType] = useState<"claim" | "proposal">("claim");
  const [docs, setDocs] = useState<RequiredDoc[]>([{ name: "", description: "", required: true }]);
  const [saving, setSaving] = useState(false);

  const addDoc = () => setDocs(d => [...d, { name: "", description: "", required: true }]);
  const removeDoc = (i: number) => setDocs(d => d.filter((_, idx) => idx !== i));
  const updateDoc = (i: number, field: keyof RequiredDoc, value: string | boolean) =>
    setDocs(d => d.map((doc, idx) => idx === i ? { ...doc, [field]: value } : doc));

  const handleSave = async () => {
    if (!convexUser) return;
    const valid = docs.filter(d => d.name.trim());
    if (valid.length === 0) { toast.error("Add at least one document"); return; }
    setSaving(true);
    try {
      await createReq({ productType, entityType, requiredDocuments: valid, createdBy: convexUser._id });
      toast.success("Document requirements saved");
      setDocs([{ name: "", description: "", required: true }]);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"documentRequirements">) => {
    await removeReq({ id });
    toast.success("Requirement deleted");
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Document Requirements</h2>

      {/* Create new */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Add New Requirement Set</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Product Type</Label>
            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>For</Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as "claim" | "proposal")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="claim">Claim</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Required Documents</Label>
          {docs.map((doc, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input placeholder="Document name" value={doc.name} onChange={e => updateDoc(i, "name", e.target.value)} />
                <Input placeholder="Description" value={doc.description} onChange={e => updateDoc(i, "description", e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox checked={doc.required} onCheckedChange={v => updateDoc(i, "required", !!v)} />
                <span className="text-xs text-gray-500">Required</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeDoc(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addDoc} className="flex items-center gap-1"><Plus size={13} /> Add Document</Button>
        </div>

        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save size={14} /> {saving ? "Saving..." : "Save Requirements"}
        </Button>
      </div>

      {/* Existing requirements */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Existing Requirements</h3>
        {!requirements ? <div className="text-gray-400">Loading...</div> :
          requirements.length === 0 ? <div className="text-gray-400 text-sm">None configured yet</div> :
            requirements.map(req => (
              <div key={req._id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-gray-800 capitalize">{req.productType}</span>
                    <span className="text-xs text-gray-400 ml-2">({req.entityType})</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(req._id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="space-y-1">
                  {req.requiredDocuments.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.required ? "bg-blue-500" : "bg-gray-300"}`} />
                      <span>{d.name}</span>
                      {!d.required && <span className="text-xs text-gray-400">(optional)</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

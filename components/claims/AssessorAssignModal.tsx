"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface AssessorAssignModalProps {
  claimId: Id<"claims">;
  officerId: Id<"users">;
  open: boolean;
  onClose: () => void;
}

export function AssessorAssignModal({ claimId, officerId, open, onClose }: AssessorAssignModalProps) {
  const [assessorId, setAssessorId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const assessors = useQuery(api.users.listByRole, { role: "assessor" });
  const assignAssessor = useMutation(api.claims.assignAssessor);

  const handleAssign = async () => {
    if (!assessorId) return;
    setLoading(true);
    try {
      await assignAssessor({
        claimId,
        assessorId: assessorId as Id<"users">,
        officerId,
        notes: notes || undefined,
      });
      toast.success("Assessor assigned successfully");
      onClose();
    } catch (e) {
      toast.error("Failed to assign assessor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Assessor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Select Assessor</Label>
            <Select value={assessorId} onValueChange={setAssessorId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assessor..." />
              </SelectTrigger>
              <SelectContent>
                {assessors?.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any instructions for the assessor..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!assessorId || loading}>
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

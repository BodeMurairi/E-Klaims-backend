import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Allowed status transitions (server-side enforcement)
const TRANSITIONS: Record<string, string[]> = {
  submitted: ["documents_pending", "under_review"],
  documents_pending: ["under_review"],
  under_review: ["assessor_assigned", "approved", "rejected"],
  assessor_assigned: ["assessment_completed"],
  assessment_completed: ["approved", "rejected"],
  approved: ["payment_processing"],
  payment_processing: ["paid"],
  rejected: [],
  paid: [],
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  documents_pending: "Documents Pending",
  under_review: "Under Review",
  assessor_assigned: "Assessor Assigned",
  assessment_completed: "Assessment Completed",
  approved: "Approved",
  rejected: "Rejected",
  payment_processing: "Payment Processing",
  paid: "Paid",
};

export const submit = mutation({
  args: {
    policyId: v.id("policies"),
    clientId: v.id("users"),
    submittedBy: v.id("users"),
    dateOfLoss: v.number(),
    description: v.string(),
    location: v.string(),
    estimatedLoss: v.number(),
    documents: v.array(v.id("documents")),
    voiceNoteStorageId: v.optional(v.string()),
    voiceNoteTranscript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const count = (await ctx.db.query("claims").collect()).length + 1;
    const year = new Date().getFullYear();
    const claimId = `CLM-${year}-${String(count).padStart(4, "0")}`;
    const now = Date.now();

    const id = await ctx.db.insert("claims", {
      ...args,
      claimId,
      status: "submitted",
      approvedAmount: undefined,
      statusHistory: [
        {
          status: "submitted",
          timestamp: now,
          userId: args.submittedBy,
          notes: "Claim submitted",
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Notify claims officers
    const claimsOfficers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "claims_officer"))
      .collect();

    for (const officer of claimsOfficers) {
      await ctx.db.insert("notifications", {
        userId: officer._id,
        title: "New Claim Submitted",
        message: `Claim ${claimId} has been submitted and requires review.`,
        read: false,
        type: "claim_status",
        link: `/claims-officer/claims/${id}`,
        entityId: id,
        createdAt: now,
      });
    }

    // Audit log
    await ctx.db.insert("auditLogs", {
      userId: args.submittedBy,
      action: "claim.submitted",
      entityId: id,
      entityType: "claim",
      metadata: { claimId, policyId: args.policyId },
      timestamp: now,
    });

    return { id, claimId };
  },
});

// Agent creates a claim draft on behalf of client — no notification yet
export const submitByAgent = mutation({
  args: {
    policyId: v.id("policies"),
    clientId: v.id("users"),
    distributorId: v.id("users"),
    dateOfLoss: v.number(),
    description: v.string(),
    location: v.string(),
    estimatedLoss: v.number(),
    documents: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const count = (await ctx.db.query("claims").collect()).length + 1;
    const year = new Date().getFullYear();
    const claimId = `CLM-${year}-${String(count).padStart(4, "0")}`;
    const now = Date.now();

    const id = await ctx.db.insert("claims", {
      policyId: args.policyId,
      clientId: args.clientId,
      submittedBy: args.distributorId,
      dateOfLoss: args.dateOfLoss,
      description: args.description,
      location: args.location,
      estimatedLoss: args.estimatedLoss,
      documents: args.documents,
      claimId,
      status: "submitted",
      approvedAmount: undefined,
      pendingClientConfirmation: true,
      initiatedByDistributorId: args.distributorId,
      statusHistory: [
        {
          status: "submitted",
          timestamp: now,
          userId: args.distributorId,
          notes: "Claim initiated by agent — awaiting client confirmation",
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    return { id, claimId };
  },
});

// Agent sends the claim for client confirmation after uploading documents
export const sendForClientConfirmation = mutation({
  args: {
    claimId: v.id("claims"),
    distributorId: v.id("users"),
  },
  handler: async (ctx, { claimId, distributorId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");
    if (claim.initiatedByDistributorId !== distributorId) throw new Error("Not authorised");

    const agent = await ctx.db.get(distributorId);
    const now = Date.now();

    await ctx.db.insert("notifications", {
      userId: claim.clientId,
      title: "Claim Submitted on Your Behalf",
      message: `Your agent ${agent?.name ?? "your agent"} has submitted claim ${claim.claimId} on your behalf. Please review and confirm.`,
      read: false,
      type: "claim_status",
      link: `/client/claims`,
      entityId: claimId,
      createdAt: now,
    });
  },
});

// Client confirms an agent-initiated claim → notifies claims officers
export const confirmByClient = mutation({
  args: {
    claimId: v.id("claims"),
    clientId: v.id("users"),
  },
  handler: async (ctx, { claimId, clientId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");
    if (claim.clientId !== clientId) throw new Error("Not authorised");

    const now = Date.now();
    await ctx.db.patch(claimId, {
      pendingClientConfirmation: false,
      statusHistory: [
        ...claim.statusHistory,
        { status: "submitted", timestamp: now, userId: clientId, notes: "Confirmed by client" },
      ],
      updatedAt: now,
    });

    // Notify claims officers
    const officers = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "claims_officer")).collect();
    for (const officer of officers) {
      await ctx.db.insert("notifications", {
        userId: officer._id,
        title: "New Claim Submitted",
        message: `Claim ${claim.claimId} has been confirmed by the client and requires review.`,
        read: false,
        type: "claim_status",
        link: `/claims-officer/claims/${claimId}`,
        entityId: claimId,
        createdAt: now,
      });
    }
  },
});

// Client declines an agent-initiated claim → removes it
export const declineByClient = mutation({
  args: {
    claimId: v.id("claims"),
    clientId: v.id("users"),
  },
  handler: async (ctx, { claimId, clientId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");
    if (claim.clientId !== clientId) throw new Error("Not authorised");

    const now = Date.now();

    // Notify the agent
    if (claim.initiatedByDistributorId) {
      await ctx.db.insert("notifications", {
        userId: claim.initiatedByDistributorId,
        title: "Claim Declined by Client",
        message: `The client declined claim ${claim.claimId} that you submitted on their behalf.`,
        read: false,
        type: "claim_status",
        link: `/distributor/policies`,
        entityId: claimId,
        createdAt: now,
      });
    }

    await ctx.db.delete(claimId);
  },
});

export const updateStatus = mutation({
  args: {
    claimId: v.id("claims"),
    newStatus: v.string(),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { claimId, newStatus, userId, notes }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    const allowed = TRANSITIONS[claim.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${claim.status} to ${newStatus}`
      );
    }

    const now = Date.now();
    const newHistoryEntry = {
      status: newStatus,
      timestamp: now,
      userId,
      notes,
    };

    await ctx.db.patch(claimId, {
      status: newStatus as "submitted" | "documents_pending" | "under_review" | "assessor_assigned" | "assessment_completed" | "approved" | "rejected" | "payment_processing" | "paid",
      statusHistory: [...claim.statusHistory, newHistoryEntry],
      updatedAt: now,
    });

    // Notify client
    await ctx.db.insert("notifications", {
      userId: claim.clientId,
      title: "Claim Status Updated",
      message: `Your claim ${claim.claimId} status changed to: ${STATUS_LABELS[newStatus] ?? newStatus}`,
      read: false,
      type: "claim_status",
      link: `/client/claims/${claimId}`,
      entityId: claimId,
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      userId,
      action: "claim.status_changed",
      entityId: claimId,
      entityType: "claim",
      metadata: { from: claim.status, to: newStatus, claimId: claim.claimId },
      timestamp: now,
    });
  },
});

export const assignAssessor = mutation({
  args: {
    claimId: v.id("claims"),
    assessorId: v.id("users"),
    officerId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { claimId, assessorId, officerId, notes }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    const now = Date.now();
    await ctx.db.patch(claimId, {
      assignedAssessorId: assessorId,
      assignedClaimsOfficerId: officerId,
      status: "assessor_assigned",
      statusHistory: [
        ...claim.statusHistory,
        {
          status: "assessor_assigned",
          timestamp: now,
          userId: officerId,
          notes: notes ?? "Assessor assigned",
        },
      ],
      updatedAt: now,
    });

    // Notify assessor
    await ctx.db.insert("notifications", {
      userId: assessorId,
      title: "New Assessment Assignment",
      message: `You have been assigned to assess claim ${claim.claimId}.`,
      read: false,
      type: "assignment",
      link: `/assessor/assignments/${claimId}`,
      entityId: claimId,
      createdAt: now,
    });
  },
});

export const submitAssessment = mutation({
  args: {
    claimId: v.id("claims"),
    assessorId: v.id("users"),
    findings: v.string(),
    recommendedAmount: v.number(),
    documents: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, { claimId, assessorId, findings, recommendedAmount, documents }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    const now = Date.now();
    await ctx.db.patch(claimId, {
      assessmentFindings: findings,
      assessmentRecommendedAmount: recommendedAmount,
      documents: documents ? [...claim.documents, ...documents] : claim.documents,
      status: "assessment_completed",
      statusHistory: [
        ...claim.statusHistory,
        {
          status: "assessment_completed",
          timestamp: now,
          userId: assessorId,
          notes: `Assessment submitted. Recommended payout: ${recommendedAmount}`,
        },
      ],
      updatedAt: now,
    });

    // Notify claims officer
    if (claim.assignedClaimsOfficerId) {
      await ctx.db.insert("notifications", {
        userId: claim.assignedClaimsOfficerId,
        title: "Assessment Completed",
        message: `Assessment for claim ${claim.claimId} has been completed. Recommended: ${recommendedAmount}`,
        read: false,
        type: "claim_status",
        link: `/claims-officer/claims/${claimId}`,
        entityId: claimId,
        createdAt: now,
      });
    }
  },
});

export const approveClaim = mutation({
  args: {
    claimId: v.id("claims"),
    userId: v.id("users"),
    approvedAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { claimId, userId, approvedAmount, notes }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    const now = Date.now();
    await ctx.db.patch(claimId, {
      approvedAmount,
      status: "approved",
      statusHistory: [
        ...claim.statusHistory,
        {
          status: "approved",
          timestamp: now,
          userId,
          notes: notes ?? `Claim approved. Amount: ${approvedAmount}`,
        },
      ],
      updatedAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: claim.clientId,
      title: "Claim Approved",
      message: `Your claim ${claim.claimId} has been approved for ${approvedAmount}.`,
      read: false,
      type: "claim_status",
      link: `/client/claims/${claimId}`,
      entityId: claimId,
      createdAt: now,
    });
  },
});

export const rejectClaim = mutation({
  args: {
    claimId: v.id("claims"),
    userId: v.id("users"),
    rejectionReason: v.string(),
  },
  handler: async (ctx, { claimId, userId, rejectionReason }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    const now = Date.now();
    await ctx.db.patch(claimId, {
      rejectionReason,
      status: "rejected",
      statusHistory: [
        ...claim.statusHistory,
        {
          status: "rejected",
          timestamp: now,
          userId,
          notes: rejectionReason,
        },
      ],
      updatedAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: claim.clientId,
      title: "Claim Rejected",
      message: `Your claim ${claim.claimId} has been rejected. Reason: ${rejectionReason}`,
      read: false,
      type: "claim_status",
      link: `/client/claims/${claimId}`,
      entityId: claimId,
      createdAt: now,
    });
  },
});

export const getById = query({
  args: { id: v.id("claims") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const getByClaimId = query({
  args: { claimId: v.string() },
  handler: async (ctx, { claimId }) => {
    return ctx.db
      .query("claims")
      .withIndex("by_claim_id", (q) => q.eq("claimId", claimId))
      .unique();
  },
});

export const listByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    return ctx.db
      .query("claims")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
  },
});

export const listByStatus = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, { status }) => {
    if (!status) {
      return ctx.db.query("claims").order("desc").collect();
    }
    return ctx.db
      .query("claims")
      .withIndex("by_status", (q) =>
        q.eq("status", status as "submitted" | "documents_pending" | "under_review" | "assessor_assigned" | "assessment_completed" | "approved" | "rejected" | "payment_processing" | "paid")
      )
      .order("desc")
      .collect();
  },
});

export const listByAssessor = query({
  args: { assessorId: v.id("users") },
  handler: async (ctx, { assessorId }) => {
    return ctx.db
      .query("claims")
      .withIndex("by_assessor", (q) => q.eq("assignedAssessorId", assessorId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("claims").order("desc").collect();
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitFromOnboarding = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    nationalId: v.optional(v.string()),
    productType: v.string(),
    sumInsured: v.number(),
    riskDetails: v.object({ data: v.any() }),
    uploadedFiles: v.array(
      v.object({
        storageId: v.string(),
        name: v.string(),
        mimeType: v.optional(v.string()),
        sizeBytes: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Upsert Convex user
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    let userId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        phone: args.phone,
        nationalId: args.nationalId,
        name: args.name,
        onboardingComplete: true,
        updatedAt: now,
      });
      userId = existing._id;
    } else {
      userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        name: args.name,
        email: args.email,
        phone: args.phone,
        nationalId: args.nationalId,
        role: "client",
        onboardingComplete: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Create proposal
    const proposalId = await ctx.db.insert("proposals", {
      clientId: userId,
      productType: args.productType,
      riskDetails: args.riskDetails,
      sumInsured: args.sumInsured,
      status: "pending",
      documents: [],
      createdAt: now,
      updatedAt: now,
    });

    // 3. Create document records and link to proposal
    const documentIds = [];
    for (const file of args.uploadedFiles) {
      const docId = await ctx.db.insert("documents", {
        name: file.name,
        fileId: file.storageId,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        entityId: proposalId,
        entityType: "proposal",
        uploadedBy: userId,
        verified: false,
        flagged: false,
        createdAt: now,
      });
      documentIds.push(docId);
    }
    if (documentIds.length > 0) {
      await ctx.db.patch(proposalId, { documents: documentIds });
    }

    // 4. Notify all underwriters
    const underwriters = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "underwriter"))
      .collect();

    for (const uw of underwriters) {
      await ctx.db.insert("notifications", {
        userId: uw._id,
        title: "New Application Submitted",
        message: `${args.name} submitted a new ${args.productType} insurance application.`,
        read: false,
        type: "proposal_status",
        link: `/underwriter/proposals/${proposalId}`,
        entityId: proposalId,
        createdAt: now,
      });
    }

    return { userId, proposalId };
  },
});

export const submit = mutation({
  args: {
    clientId: v.id("users"),
    distributorId: v.id("users"),
    productType: v.string(),
    riskDetails: v.object({ data: v.any() }),
    sumInsured: v.number(),
    premium: v.optional(v.number()),
    documents: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const proposalId = await ctx.db.insert("proposals", {
      ...args,
      status: "pending",
      updatedAt: now,
      createdAt: now,
    });

    // Notify all underwriters of new proposal
    const underwriters = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "underwriter"))
      .collect();

    for (const uw of underwriters) {
      await ctx.db.insert("notifications", {
        userId: uw._id,
        title: "New Proposal Submitted",
        message: `A new ${args.productType} proposal has been submitted for review.`,
        read: false,
        type: "proposal_status",
        link: `/underwriter/proposals/${proposalId}`,
        entityId: proposalId,
        createdAt: now,
      });
    }

    return proposalId;
  },
});

export const getById = query({
  args: { id: v.id("proposals") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const listByDistributor = query({
  args: { distributorId: v.id("users") },
  handler: async (ctx, { distributorId }) => {
    return ctx.db
      .query("proposals")
      .withIndex("by_distributor", (q) => q.eq("distributorId", distributorId))
      .order("desc")
      .collect();
  },
});

export const listByUnderwriter = query({
  args: { underwriterId: v.id("users") },
  handler: async (ctx, { underwriterId }) => {
    return ctx.db
      .query("proposals")
      .withIndex("by_underwriter", (q) => q.eq("underwriterId", underwriterId))
      .order("desc")
      .collect();
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("proposals").order("desc").collect();
  },
});

export const listByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    return ctx.db
      .query("proposals")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
  },
});

export const assignUnderwriter = mutation({
  args: {
    proposalId: v.id("proposals"),
    underwriterId: v.id("users"),
  },
  handler: async (ctx, { proposalId, underwriterId }) => {
    await ctx.db.patch(proposalId, {
      underwriterId,
      status: "under_review",
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    proposalId: v.id("proposals"),
    status: v.union(
      v.literal("pending"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("more_documents")
    ),
    underwriterNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    underwriterId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");

    await ctx.db.patch(args.proposalId, {
      status: args.status,
      underwriterNotes: args.underwriterNotes ?? proposal.underwriterNotes,
      rejectionReason: args.rejectionReason,
      underwriterId: args.underwriterId ?? proposal.underwriterId,
      updatedAt: Date.now(),
    });

    const now = Date.now();
    const statusLabels: Record<string, string> = {
      approved: "Your proposal has been approved!",
      rejected: "Your proposal has been rejected.",
      more_documents: "Additional documents required for your proposal.",
      under_review: "Your proposal is now under review.",
    };

    const message = statusLabels[args.status];
    if (message) {
      await ctx.db.insert("notifications", {
        userId: proposal.distributorId,
        title: "Proposal Status Updated",
        message,
        read: false,
        type: "proposal_status",
        link: `/distributor/proposals/${args.proposalId}`,
        entityId: args.proposalId,
        createdAt: now,
      });
    }
  },
});

export const setAiRiskScore = mutation({
  args: {
    proposalId: v.id("proposals"),
    aiRiskScore: v.number(),
    aiRiskSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.proposalId, {
      aiRiskScore: args.aiRiskScore,
      aiRiskSummary: args.aiRiskSummary,
      updatedAt: Date.now(),
    });
  },
});

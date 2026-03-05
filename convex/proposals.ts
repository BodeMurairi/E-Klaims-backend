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
    agentUsername: v.optional(v.string()),
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

    // 2. Resolve optional agent by username
    let agentId: typeof userId | undefined;
    if (args.agentUsername) {
      const agent = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.agentUsername))
        .unique();
      if (agent && agent.role === "distributor") agentId = agent._id;
    }

    // 3. Create proposal
    const proposalId = await ctx.db.insert("proposals", {
      clientId: userId,
      distributorId: agentId,
      productType: args.productType,
      riskDetails: args.riskDetails,
      sumInsured: args.sumInsured,
      status: "pending",
      documents: [],
      createdAt: now,
      updatedAt: now,
    });

    // 4. Create document records and link to proposal
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

    // 5. Notify agent if linked
    if (agentId) {
      await ctx.db.insert("notifications", {
        userId: agentId,
        title: "New Client Application",
        message: `${args.name} submitted a ${args.productType} application linked to you.`,
        read: false,
        type: "proposal_status",
        link: `/distributor/proposals/${proposalId}`,
        entityId: proposalId,
        createdAt: now,
      });
    }

    // 6. Notify all underwriters
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

// ─── Agent-initiated onboarding ───────────────────────────────────────────────

export const submitAgentOnboarding = mutation({
  args: {
    agentClerkId: v.string(),
    clientUsername: v.string(),
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

    // 1. Resolve agent
    const agent = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.agentClerkId))
      .unique();
    if (!agent || agent.role !== "distributor") throw new Error("Agent not found");

    // 2. Resolve client by username
    const client = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.clientUsername))
      .unique();
    if (!client || client.role !== "client") throw new Error("Client not found");

    // 3. Create proposal in pending-confirmation state
    const proposalId = await ctx.db.insert("proposals", {
      clientId: client._id,
      distributorId: agent._id,
      initiatedByAgentId: agent._id,
      pendingClientConfirmation: true,
      productType: args.productType,
      riskDetails: args.riskDetails,
      sumInsured: args.sumInsured,
      status: "pending",
      documents: [],
      createdAt: now,
      updatedAt: now,
    });

    // 4. Upload documents
    const documentIds = [];
    for (const file of args.uploadedFiles) {
      const docId = await ctx.db.insert("documents", {
        name: file.name,
        fileId: file.storageId,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        entityId: proposalId,
        entityType: "proposal",
        uploadedBy: agent._id,
        verified: false,
        flagged: false,
        createdAt: now,
      });
      documentIds.push(docId);
    }
    if (documentIds.length > 0) {
      await ctx.db.patch(proposalId, { documents: documentIds });
    }

    // 5. Notify client to confirm
    await ctx.db.insert("notifications", {
      userId: client._id,
      title: "Insurance Application Requires Your Approval",
      message: `Agent ${agent.name} has prepared a ${args.productType} insurance application on your behalf. Please review and confirm.`,
      read: false,
      type: "proposal_status",
      link: `/client`,
      entityId: proposalId,
      createdAt: now,
    });

    return { proposalId, clientId: client._id };
  },
});

export const confirmAgentOnboarding = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    await ctx.db.patch(proposalId, {
      pendingClientConfirmation: false,
      updatedAt: Date.now(),
    });

    // Notify agent
    if (proposal.initiatedByAgentId) {
      const client = await ctx.db.get(proposal.clientId);
      await ctx.db.insert("notifications", {
        userId: proposal.initiatedByAgentId,
        title: "Client Confirmed Application",
        message: `${client?.name ?? "The client"} has confirmed the ${proposal.productType} application you submitted on their behalf.`,
        read: false,
        type: "proposal_status",
        link: `/distributor/proposals/${proposalId}`,
        entityId: proposalId,
        createdAt: Date.now(),
      });
    }

    // Notify underwriters
    const underwriters = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "underwriter"))
      .collect();

    const client = await ctx.db.get(proposal.clientId);
    for (const uw of underwriters) {
      await ctx.db.insert("notifications", {
        userId: uw._id,
        title: "New Application Submitted",
        message: `${client?.name ?? "A client"} confirmed a new ${proposal.productType} insurance application.`,
        read: false,
        type: "proposal_status",
        link: `/underwriter/proposals/${proposalId}`,
        entityId: proposalId,
        createdAt: Date.now(),
      });
    }
  },
});

export const rejectAgentOnboarding = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Notify agent of rejection
    if (proposal.initiatedByAgentId) {
      const client = await ctx.db.get(proposal.clientId);
      await ctx.db.insert("notifications", {
        userId: proposal.initiatedByAgentId,
        title: "Client Declined Application",
        message: `${client?.name ?? "The client"} has declined the ${proposal.productType} application you submitted on their behalf.`,
        read: false,
        type: "proposal_status",
        link: `/distributor`,
        entityId: proposalId,
        createdAt: Date.now(),
      });
    }

    await ctx.db.delete(proposalId);
  },
});

export const listPendingConfirmations = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    return ctx.db
      .query("proposals")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .filter((q) => q.eq(q.field("pendingClientConfirmation"), true))
      .order("desc")
      .collect();
  },
});

export const listByAgent = query({
  args: { agentId: v.id("users") },
  handler: async (ctx, { agentId }) => {
    return ctx.db
      .query("proposals")
      .withIndex("by_agent", (q) => q.eq("initiatedByAgentId", agentId))
      .order("desc")
      .collect();
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

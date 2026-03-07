import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── USERS ────────────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("client"),
      v.literal("distributor"),
      v.literal("underwriter"),
      v.literal("claims_officer"),
      v.literal("assessor"),
      v.literal("admin")
    ),
    username: v.optional(v.string()),
    phone: v.optional(v.string()),
    nationalId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    onboardingComplete: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // ─── POLICIES ─────────────────────────────────────────────────────────────
  policies: defineTable({
    policyNumber: v.string(),
    clientId: v.id("users"),
    distributorId: v.optional(v.id("users")),
    underwriterId: v.optional(v.id("users")),
    productType: v.string(),
    sumInsured: v.number(),
    premium: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("suspended")
    ),
    startDate: v.number(),
    endDate: v.number(),
    documents: v.array(v.id("documents")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_distributor", ["distributorId"])
    .index("by_underwriter", ["underwriterId"])
    .index("by_policy_number", ["policyNumber"])
    .index("by_status", ["status"]),

  // ─── PROPOSALS ────────────────────────────────────────────────────────────
  proposals: defineTable({
    clientId: v.id("users"),
    distributorId: v.optional(v.id("users")),
    underwriterId: v.optional(v.id("users")),
    productType: v.string(),
    riskDetails: v.object({ data: v.any() }),
    sumInsured: v.number(),
    premium: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("more_documents")
    ),
    aiRiskScore: v.optional(v.number()),
    aiRiskSummary: v.optional(v.string()),
    documents: v.array(v.id("documents")),
    underwriterNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    convertedPolicyId: v.optional(v.id("policies")),
    // Agent-initiated onboarding — proposal awaits client confirmation
    pendingClientConfirmation: v.optional(v.boolean()),
    initiatedByAgentId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_distributor", ["distributorId"])
    .index("by_underwriter", ["underwriterId"])
    .index("by_status", ["status"])
    .index("by_agent", ["initiatedByAgentId"]),

  // ─── CLAIMS ───────────────────────────────────────────────────────────────
  claims: defineTable({
    claimId: v.string(),
    policyId: v.id("policies"),
    clientId: v.id("users"),
    submittedBy: v.id("users"),
    status: v.union(
      v.literal("submitted"),
      v.literal("documents_pending"),
      v.literal("under_review"),
      v.literal("assessor_assigned"),
      v.literal("assessment_completed"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("payment_processing"),
      v.literal("paid")
    ),
    dateOfLoss: v.number(),
    description: v.string(),
    location: v.string(),
    estimatedLoss: v.number(),
    approvedAmount: v.optional(v.number()),
    documents: v.array(v.id("documents")),
    statusHistory: v.array(
      v.object({
        status: v.string(),
        timestamp: v.number(),
        userId: v.id("users"),
        notes: v.optional(v.string()),
      })
    ),
    assignedAssessorId: v.optional(v.id("users")),
    assignedClaimsOfficerId: v.optional(v.id("users")),
    voiceNoteStorageId: v.optional(v.string()),
    voiceNoteTranscript: v.optional(v.string()),
    assessmentFindings: v.optional(v.string()),
    assessmentRecommendedAmount: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    // Agent-initiated claims — await client confirmation before going to officers
    pendingClientConfirmation: v.optional(v.boolean()),
    initiatedByDistributorId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_policy", ["policyId"])
    .index("by_status", ["status"])
    .index("by_claim_id", ["claimId"])
    .index("by_assessor", ["assignedAssessorId"])
    .index("by_claims_officer", ["assignedClaimsOfficerId"]),

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────
  documents: defineTable({
    name: v.string(),
    fileId: v.string(),
    fileUrl: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    entityId: v.string(),
    entityType: v.union(
      v.literal("claim"),
      v.literal("proposal"),
      v.literal("policy"),
      v.literal("onboarding")
    ),
    uploadedBy: v.id("users"),
    verified: v.boolean(),
    flagged: v.boolean(),
    flagReason: v.optional(v.string()),
    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityId", "entityType"])
    .index("by_uploaded_by", ["uploadedBy"]),

  // ─── DOCUMENT REQUIREMENTS ────────────────────────────────────────────────
  documentRequirements: defineTable({
    productType: v.string(),
    displayName: v.optional(v.string()),
    policyDescription: v.optional(v.string()),
    claimType: v.optional(v.string()),
    entityType: v.union(
      v.literal("claim"),
      v.literal("proposal"),
      v.literal("onboarding")
    ),
    requiredDocuments: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        required: v.boolean(),
        acceptedFormats: v.optional(v.array(v.string())),
      })
    ),
    coverageQuestions: v.optional(
      v.array(
        v.object({
          key: v.string(),
          label: v.string(),
          fieldType: v.union(
            v.literal("text"),
            v.literal("number"),
            v.literal("select"),
            v.literal("date"),
            v.literal("textarea")
          ),
          options: v.optional(v.array(v.string())),
          required: v.boolean(),
          placeholder: v.optional(v.string()),
        })
      )
    ),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_product_type", ["productType"])
    .index("by_entity_type", ["entityType"]),

  // ─── MESSAGES ─────────────────────────────────────────────────────────────
  messages: defineTable({
    entityId: v.string(),
    entityType: v.union(v.literal("claim"), v.literal("proposal")),
    senderId: v.id("users"),
    content: v.string(),
    isInternal: v.boolean(),
    attachmentDocumentId: v.optional(v.id("documents")),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityId", "entityType"])
    .index("by_sender", ["senderId"]),

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    type: v.union(
      v.literal("claim_status"),
      v.literal("proposal_status"),
      v.literal("document_required"),
      v.literal("message"),
      v.literal("assignment"),
      v.literal("system")
    ),
    link: v.optional(v.string()),
    entityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // ─── AUDIT LOGS ───────────────────────────────────────────────────────────
  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityId: v.string(),
    entityType: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_entity", ["entityId", "entityType"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),
});

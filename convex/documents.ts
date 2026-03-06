import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    name: v.string(),
    fileId: v.string(),
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
  },
  handler: async (ctx, args) => {
    const fileUrl = await ctx.storage.getUrl(args.fileId as Id<"_storage">);
    return ctx.db.insert("documents", {
      name: args.name,
      fileId: args.fileId,
      fileUrl: fileUrl ?? undefined,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      entityId: args.entityId,
      entityType: args.entityType,
      uploadedBy: args.uploadedBy,
      verified: false,
      flagged: false,
      createdAt: Date.now(),
    });
  },
});

export const getByEntity = query({
  args: {
    entityId: v.string(),
    entityType: v.union(
      v.literal("claim"),
      v.literal("proposal"),
      v.literal("policy"),
      v.literal("onboarding")
    ),
  },
  handler: async (ctx, { entityId, entityType }) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_entity", (q) =>
        q.eq("entityId", entityId).eq("entityType", entityType)
      )
      .collect();

    return Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        fileUrl: await ctx.storage.getUrl(doc.fileId as Id<"_storage">) ?? doc.fileUrl,
      }))
    );
  },
});

export const markVerified = mutation({
  args: {
    documentId: v.id("documents"),
    verifiedBy: v.id("users"),
  },
  handler: async (ctx, { documentId, verifiedBy }) => {
    await ctx.db.patch(documentId, {
      verified: true,
      flagged: false,
      verifiedBy,
      verifiedAt: Date.now(),
    });
  },
});

export const markFlagged = mutation({
  args: {
    documentId: v.id("documents"),
    flagReason: v.string(),
  },
  handler: async (ctx, { documentId, flagReason }) => {
    await ctx.db.patch(documentId, {
      flagged: true,
      verified: false,
      flagReason,
    });
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new Error("Document not found");
    await ctx.storage.delete(doc.fileId as Id<"_storage">);
    await ctx.db.delete(documentId);
  },
});

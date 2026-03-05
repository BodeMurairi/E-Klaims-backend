import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("claim"), v.literal("proposal")),
    senderId: v.id("users"),
    content: v.string(),
    isInternal: v.boolean(),
    attachmentDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listByEntity = query({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("claim"), v.literal("proposal")),
    includeInternal: v.boolean(),
  },
  handler: async (ctx, { entityId, entityType, includeInternal }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_entity", (q) =>
        q.eq("entityId", entityId).eq("entityType", entityType)
      )
      .order("asc")
      .collect();

    if (includeInternal) return messages;
    return messages.filter((m) => !m.isInternal);
  },
});

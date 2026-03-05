import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    entityId: v.string(),
    entityType: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const listByEntity = query({
  args: {
    entityId: v.string(),
    entityType: v.string(),
  },
  handler: async (ctx, { entityId, entityType }) => {
    return ctx.db
      .query("auditLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityId", entityId).eq("entityType", entityType)
      )
      .order("desc")
      .collect();
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit ?? 20);
  },
});

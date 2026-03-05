import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const requiredDocumentSchema = v.object({
  name: v.string(),
  description: v.string(),
  required: v.boolean(),
  acceptedFormats: v.optional(v.array(v.string())),
});

export const list = query({
  args: {
    entityType: v.optional(
      v.union(
        v.literal("claim"),
        v.literal("proposal"),
        v.literal("onboarding")
      )
    ),
    productType: v.optional(v.string()),
  },
  handler: async (ctx, { entityType, productType }) => {
    let q = ctx.db.query("documentRequirements");
    if (productType) {
      return q
        .withIndex("by_product_type", (idx) => idx.eq("productType", productType))
        .collect();
    }
    if (entityType) {
      return q
        .withIndex("by_entity_type", (idx) => idx.eq("entityType", entityType))
        .collect();
    }
    return q.collect();
  },
});

export const getForProduct = query({
  args: {
    productType: v.string(),
    entityType: v.union(
      v.literal("claim"),
      v.literal("proposal"),
      v.literal("onboarding")
    ),
  },
  handler: async (ctx, { productType, entityType }) => {
    const results = await ctx.db
      .query("documentRequirements")
      .withIndex("by_product_type", (q) => q.eq("productType", productType))
      .collect();
    return results.filter((r) => r.entityType === entityType);
  },
});

export const create = mutation({
  args: {
    productType: v.string(),
    claimType: v.optional(v.string()),
    entityType: v.union(
      v.literal("claim"),
      v.literal("proposal"),
      v.literal("onboarding")
    ),
    requiredDocuments: v.array(requiredDocumentSchema),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("documentRequirements", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("documentRequirements"),
    requiredDocuments: v.array(requiredDocumentSchema),
  },
  handler: async (ctx, { id, requiredDocuments }) => {
    await ctx.db.patch(id, { requiredDocuments, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("documentRequirements") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

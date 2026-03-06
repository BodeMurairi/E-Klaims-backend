import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

let policyCounter = 0;

export const getById = query({
  args: { id: v.id("policies") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const getByPolicyNumber = query({
  args: { policyNumber: v.string() },
  handler: async (ctx, { policyNumber }) => {
    return ctx.db
      .query("policies")
      .withIndex("by_policy_number", (q) => q.eq("policyNumber", policyNumber))
      .unique();
  },
});

export const listByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    return ctx.db
      .query("policies")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
  },
});

export const listByDistributor = query({
  args: { distributorId: v.id("users") },
  handler: async (ctx, { distributorId }) => {
    return ctx.db
      .query("policies")
      .withIndex("by_distributor", (q) => q.eq("distributorId", distributorId))
      .order("desc")
      .collect();
  },
});

export const listByUnderwriter = query({
  args: { underwriterId: v.id("users") },
  handler: async (ctx, { underwriterId }) => {
    return ctx.db
      .query("policies")
      .withIndex("by_underwriter", (q) => q.eq("underwriterId", underwriterId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("policies").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    clientId: v.id("users"),
    distributorId: v.optional(v.id("users")),
    underwriterId: v.optional(v.id("users")),
    productType: v.string(),
    sumInsured: v.number(),
    premium: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const count = (await ctx.db.query("policies").collect()).length + 1;
    const year = new Date().getFullYear();
    const policyNumber = `POL-${year}-${String(count).padStart(4, "0")}`;
    const now = Date.now();

    return ctx.db.insert("policies", {
      ...args,
      policyNumber,
      status: "active",
      documents: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    policyId: v.id("policies"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("suspended")
    ),
  },
  handler: async (ctx, { policyId, status }) => {
    await ctx.db.patch(policyId, { status, updatedAt: Date.now() });
  },
});

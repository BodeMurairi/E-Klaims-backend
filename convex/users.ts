import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const listByRole = query({
  args: { role: v.string() },
  handler: async (ctx, { role }) => {
    return ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", role as "client" | "distributor" | "underwriter" | "claims_officer" | "assessor" | "admin"))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("users").collect();
  },
});

export const createFromWebhook = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) return existing._id;

    const now = Date.now();
    return ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      role: "client",
      onboardingComplete: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeOnboarding = mutation({
  args: {
    clerkId: v.string(),
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
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();

    if (!user) {
      const id = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        name: args.name ?? "User",
        email: args.email ?? "",
        role: args.role,
        username: args.username,
        phone: args.phone,
        onboardingComplete: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }

    await ctx.db.patch(user._id, {
      role: args.role,
      onboardingComplete: true,
      username: args.username ?? user.username,
      phone: args.phone,
      name: args.name ?? user.name,
      updatedAt: now,
    });

    return user._id;
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, { ids }) => {
    const results = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return results.filter(Boolean) as NonNullable<(typeof results)[number]>[];
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    return ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("client"),
      v.literal("distributor"),
      v.literal("underwriter"),
      v.literal("claims_officer"),
      v.literal("assessor"),
      v.literal("admin")
    ),
  },
  handler: async (ctx, { userId, role }) => {
    await ctx.db.patch(userId, { role, updatedAt: Date.now() });
  },
});

export const setActiveStatus = mutation({
  args: {
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, { userId, isActive }) => {
    await ctx.db.patch(userId, { isActive, updatedAt: Date.now() });
  },
});

export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const syncFromWebhook = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return;

    await ctx.db.patch(user._id, {
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      updatedAt: Date.now(),
    });
  },
});

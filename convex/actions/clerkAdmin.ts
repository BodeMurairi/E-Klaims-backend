"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const setUserRole = action({
  args: {
    clerkId: v.string(),
    userId: v.id("users"),
    role: v.union(
      v.literal("client"),
      v.literal("distributor"),
      v.literal("underwriter"),
      v.literal("claims_officer"),
      v.literal("assessor"),
      v.literal("admin")
    ),
    onboardingComplete: v.boolean(),
  },
  handler: async (ctx, { clerkId, userId, role, onboardingComplete }) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY not configured");

    // Update Clerk publicMetadata
    const response = await fetch(
      `https://api.clerk.com/v1/users/${clerkId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: { role, onboardingComplete },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update Clerk metadata: ${error}`);
    }

    // Also update in Convex
    await ctx.runMutation(api.users.updateRole, { userId, role });
  },
});

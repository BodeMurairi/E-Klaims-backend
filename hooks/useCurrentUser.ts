"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    isLoaded && user?.id ? { clerkId: user.id } : "skip"
  );

  return {
    clerkUser: user,
    convexUser,
    isLoaded: isLoaded && convexUser !== undefined,
    isSignedIn: !!user,
  };
}

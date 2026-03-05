"use client";

import { useUser } from "@clerk/nextjs";
import { UserRole } from "@/lib/types";

export function useRole(): UserRole | undefined {
  const { user } = useUser();
  return (user?.publicMetadata as { role?: UserRole })?.role;
}

export function useOnboardingComplete(): boolean {
  const { user } = useUser();
  return !!(user?.publicMetadata as { onboardingComplete?: boolean })?.onboardingComplete;
}

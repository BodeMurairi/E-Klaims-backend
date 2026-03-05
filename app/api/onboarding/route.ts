import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, onboardingComplete } = await req.json();

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role, onboardingComplete },
  });

  const res = NextResponse.json({ success: true });
  // Set a short-lived cookie so middleware knows onboarding just completed
  // (the Clerk JWT may still be stale for up to 60s)
  res.cookies.set("onboarding_complete", role, {
    httpOnly: true,
    maxAge: 120,
    path: "/",
    sameSite: "lax",
  });
  return res;
}

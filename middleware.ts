import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ROLE_DASHBOARD_PATHS } from "@/lib/constants";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const path = req.nextUrl.pathname;

  // If a signed-in user who has already completed onboarding tries to access
  // /onboarding, redirect them straight to their dashboard.
  if (path.startsWith("/onboarding")) {
    if (userId) {
      const meta = (sessionClaims as any)?.publicMetadata as
        | { role?: string; onboardingComplete?: boolean }
        | undefined;
      if (meta?.onboardingComplete && meta.role && ROLE_DASHBOARD_PATHS[meta.role]) {
        return NextResponse.redirect(
          new URL(ROLE_DASHBOARD_PATHS[meta.role], req.url)
        );
      }
    }
    return NextResponse.next();
  }

  if (isPublicRoute(req)) return NextResponse.next();

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

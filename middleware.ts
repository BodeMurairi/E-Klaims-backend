import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/onboarding(.*)",
]);

const isClientRoute = createRouteMatcher(["/client(.*)"]);
const isDistributorRoute = createRouteMatcher(["/distributor(.*)"]);
const isUnderwriterRoute = createRouteMatcher(["/underwriter(.*)"]);
const isClaimsOfficerRoute = createRouteMatcher(["/claims-officer(.*)"]);
const isAssessorRoute = createRouteMatcher(["/assessor(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes
  if (isPublicRoute(req)) return NextResponse.next();

  // Redirect unauthenticated users
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  const metadata = sessionClaims?.publicMetadata as
    | { role?: string; onboardingComplete?: boolean }
    | undefined;
  // Also accept the short-lived cookie set right after onboarding completes
  // (the Clerk JWT may still be stale while the cookie is fresh)
  const onboardingCookieRole = req.cookies.get("onboarding_complete")?.value;
  const onboardingComplete = metadata?.onboardingComplete || !!onboardingCookieRole;
  const role = metadata?.role || onboardingCookieRole;

  // Force onboarding if incomplete
  if (!onboardingComplete && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Role-based route protection
  if (onboardingComplete && role) {
    const forbidden = () =>
      NextResponse.redirect(
        new URL(
          role === "client"
            ? "/client"
            : role === "distributor"
            ? "/distributor"
            : role === "underwriter"
            ? "/underwriter"
            : role === "claims_officer"
            ? "/claims-officer"
            : role === "assessor"
            ? "/assessor"
            : "/admin",
          req.url
        )
      );

    if (isClientRoute(req) && role !== "client") return forbidden();
    if (isDistributorRoute(req) && role !== "distributor") return forbidden();
    if (isUnderwriterRoute(req) && role !== "underwriter") return forbidden();
    if (isClaimsOfficerRoute(req) && role !== "claims_officer") return forbidden();
    if (isAssessorRoute(req) && role !== "assessor") return forbidden();
    if (isAdminRoute(req) && role !== "admin") return forbidden();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

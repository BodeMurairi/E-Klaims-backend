"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ROLES, ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import { UserRole } from "@/lib/types";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, Loader2 } from "lucide-react";

const ROLE_NEXT_STEPS: Record<string, string[]> = {
  client: [
    "You'll be taken to your personal dashboard",
    "From there, apply for any insurance product",
    "Our AI advisor will guide you through the quote",
  ],
  distributor: [
    "You'll be taken to your Agent dashboard",
    "Onboard clients and manage their proposals",
    "Track commissions and client portfolios",
  ],
  default: [
    "You'll be taken to your dashboard",
    "Start managing your assigned tasks",
    "Collaborate with the team in real time",
  ],
};

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState<"role" | "profile">("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    nationalId: "",
  });

  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const existingUser = useQuery(
    api.users.getByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  const clerkFirstName = user?.firstName ?? "";
  const clerkLastName = user?.lastName ?? "";
  const clerkEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";

  // Redirect already-onboarded users to their dashboard immediately
  useEffect(() => {
    if (!user) return;
    const meta = user.publicMetadata as { role?: string; onboardingComplete?: boolean };
    if (meta.onboardingComplete && meta.role && ROLE_DASHBOARD_PATHS[meta.role]) {
      setIsRedirecting(true);
      window.location.href = ROLE_DASHBOARD_PATHS[meta.role];
    }
  }, [user]);

  // ── Role selection ────────────────────────────────────────────────────────

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);

    // Pre-fill from existing Convex user if available
    const existingPhone = existingUser?.phone ?? "";
    const [existingFirst = clerkFirstName, ...rest] =
      (existingUser?.name ?? `${clerkFirstName} ${clerkLastName}`).split(" ");
    const existingLast = rest.join(" ") || clerkLastName;

    setProfile({
      firstName: existingFirst,
      lastName: existingLast,
      username: existingUser?.username ?? "",
      phone: existingPhone,
      nationalId: "",
    });

    // If already fully onboarded, redirect immediately
    if (existingUser?.onboardingComplete) {
      window.location.href = ROLE_DASHBOARD_PATHS[role] ?? "/";
      return;
    }

    setStep("profile");
  };

  // ── Profile submit ────────────────────────────────────────────────────────

  const handleProfileSubmit = async () => {
    if (!selectedRole) return;

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!profile.username.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(profile.username.trim())) {
      toast.error("Username must be 3–20 characters: letters, numbers, underscores only.");
      return;
    }
    if (!profile.phone.trim()) {
      toast.error("Phone number is required.");
      return;
    }
    // National ID only required for clients
    if (selectedRole === "client" && !profile.nationalId.trim()) {
      toast.error("National ID / Passport is required.");
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      // 1. Save profile to Convex
      await completeOnboarding({
        clerkId: user.id,
        role: selectedRole,
        username: profile.username.trim().toLowerCase(),
        phone: profile.phone,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        email: clerkEmail,
      });

      // 2. Update Clerk metadata
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, onboardingComplete: true }),
      });
      if (!res.ok) throw new Error("Failed to update account metadata");

      // 3. Refresh Clerk session
      await user.reload();

      // 4. Redirect to role dashboard
      window.location.href = ROLE_DASHBOARD_PATHS[selectedRole] ?? "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed. Please try again.");
      setIsLoading(false);
    }
  };

  const nextSteps =
    selectedRole && ROLE_NEXT_STEPS[selectedRole]
      ? ROLE_NEXT_STEPS[selectedRole]
      : ROLE_NEXT_STEPS.default;

  // ── Render ────────────────────────────────────────────────────────────────

  // Show a plain loader while we wait for Clerk to load or while redirecting
  if (!user || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">K-Claims</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* ── Role selection ── */}
          {step === "role" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Welcome to K-Claims</h2>
                <p className="text-sm text-gray-500 mt-1">Select your role to get started.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => handleRoleSelect(role.value as UserRole)}
                    className="text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="font-medium text-gray-900 group-hover:text-blue-700">{role.label}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{role.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Profile ── */}
          {step === "profile" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Complete your profile</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set up your account details. Your username is your unique identifier on K-Claims.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="px-3 py-2 bg-gray-50 text-gray-400 border-r text-sm">@</span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                    placeholder="your_username"
                    maxLength={20}
                    className="flex-1 px-3 py-2 focus:outline-none text-sm"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  3–20 characters. Letters, numbers, underscores only. Used to find and link with other users.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={clerkEmail}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+250 700 000 000"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedRole === "client" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">National ID / Passport Number</label>
                  <input
                    type="text"
                    value={profile.nationalId}
                    onChange={(e) => setProfile((p) => ({ ...p, nationalId: e.target.value }))}
                    placeholder="ID or Passport number"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* What happens next */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">What happens next</p>
                {nextSteps.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">{item}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleProfileSubmit}
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your account…</>
                ) : (
                  <>Go to My Dashboard <ChevronRight className="w-4 h-4" /></>
                )}
              </button>

              <button
                onClick={() => setStep("role")}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                ← Back to role selection
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

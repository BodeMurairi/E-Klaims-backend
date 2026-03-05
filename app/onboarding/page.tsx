"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { ROLES, ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import { UserRole } from "@/lib/types";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

type Step = "role" | "profile" | "done";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep("profile");
  };

  const handleSubmit = async () => {
    if (!user || !selectedRole) return;
    setIsLoading(true);

    try {
      // 1. Update Convex user
      const userId = await completeOnboarding({
        clerkId: user.id,
        role: selectedRole,
        phone: phone || undefined,
        name: user.fullName || undefined,
        email: user.emailAddresses?.[0]?.emailAddress || undefined,
      });

      // 2. Update Clerk publicMetadata via API route (sets role for middleware JWT)
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, onboardingComplete: true }),
      });
      if (!res.ok) throw new Error("Failed to update Clerk metadata");

      // 3. Reload session to pick up new metadata
      await user.reload();

      setStep("done");
      toast.success("Onboarding complete! Welcome to E-Klaims.");

      setTimeout(() => {
        window.location.href = ROLE_DASHBOARD_PATHS[selectedRole];
      }, 1500);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error(`Onboarding failed: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">All Set!</h2>
          <p className="text-gray-500">Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Welcome to E-Klaims</h1>
            <p className="text-sm text-gray-500">Let's set up your account</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`h-2 flex-1 rounded-full ${step === "role" || step === "profile" ? "bg-blue-600" : "bg-gray-200"}`} />
          <div className={`h-2 flex-1 rounded-full ${step === "profile" ? "bg-blue-600" : "bg-gray-200"}`} />
        </div>

        {step === "role" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">What is your role?</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select the role that best describes your position in the insurance process.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value as UserRole)}
                  className="text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="font-medium text-gray-900 group-hover:text-blue-700">
                    {role.label}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{role.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "profile" && selectedRole && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Complete your profile</h2>
              <p className="text-sm text-gray-500 mt-1">
                You're joining as a{" "}
                <span className="font-medium text-blue-600">
                  {ROLES.find((r) => r.value === selectedRole)?.label}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={user?.fullName ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">From your Clerk profile</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.emailAddresses?.[0]?.emailAddress ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 700 000 000"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("role")}
                className="flex-1 py-2 px-4 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Setting up..." : "Complete Setup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

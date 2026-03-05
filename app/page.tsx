import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ROLE_DASHBOARD_PATHS } from "@/lib/constants";

export default async function HomePage() {
  const { userId, sessionClaims } = await auth();

  if (userId) {
    const role = (sessionClaims?.publicMetadata as { role?: string })?.role;
    const onboardingComplete = (sessionClaims?.publicMetadata as { onboardingComplete?: boolean })?.onboardingComplete;

    if (!onboardingComplete) {
      redirect("/onboarding");
    }

    if (role && ROLE_DASHBOARD_PATHS[role]) {
      redirect(ROLE_DASHBOARD_PATHS[role]);
    }

    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">E-Klaims</h1>
        </div>

        <div className="space-y-4">
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A centralized digital ecosystem connecting Clients, Distributors,
            Underwriters, Claims Officers, Assessors and Finance into one
            structured, trackable, and automated workflow system.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[
            {
              icon: "📄",
              title: "Digital Proposals",
              desc: "Submit and track insurance proposals with automated risk scoring",
            },
            {
              icon: "🔒",
              title: "Claims Automation",
              desc: "End-to-end claims workflow with real-time status tracking",
            },
            {
              icon: "🤖",
              title: "AI-Powered",
              desc: "AI chatbot, voice transcription, and document verification",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link
            href="/sign-in"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-white text-blue-600 rounded-lg font-medium border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}

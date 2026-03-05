import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) redirect("/sign-in");

  const metadata = sessionClaims?.publicMetadata as
    | { role?: string; onboardingComplete?: boolean }
    | undefined;

  if (!metadata?.onboardingComplete) redirect("/onboarding");

  const role = metadata.role as UserRole;
  if (!role) redirect("/onboarding");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={ROLE_LABELS[role] ?? "Dashboard"} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

import { currentUser } from "@clerk/nextjs/server";
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
  // currentUser() fetches fresh data from Clerk — bypasses the stale JWT cache
  const user = await currentUser();

  if (!user) redirect("/sign-in");

  const metadata = user.publicMetadata as
    | { role?: string; onboardingComplete?: boolean }
    | undefined;

  if (!metadata?.onboardingComplete) redirect("/onboarding");

  const role = metadata.role as UserRole;
  if (!role) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white" style={{ backgroundColor: '#FDF1CB' }}>
      <div className="print:hidden">
        <Sidebar role={role} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Header title={ROLE_LABELS[role] ?? "Dashboard"} />
        </div>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}

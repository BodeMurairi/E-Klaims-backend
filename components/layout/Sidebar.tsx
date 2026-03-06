"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Shield,
  Users,
  ClipboardList,
  ChevronRight,
  CheckCircle,
  UserCheck,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  client: [
    { label: "Dashboard", href: "/client", icon: <LayoutDashboard size={18} /> },
    { label: "My Policies", href: "/client/policies", icon: <Shield size={18} /> },
    { label: "My Claims", href: "/client/claims", icon: <FileText size={18} /> },
  ],
  distributor: [
    { label: "Dashboard", href: "/distributor", icon: <LayoutDashboard size={18} /> },
    { label: "Policies", href: "/distributor/policies", icon: <Shield size={18} /> },
    { label: "Clients", href: "/distributor/clients", icon: <Users size={18} /> },
  ],
  underwriter: [
    { label: "Dashboard", href: "/underwriter", icon: <LayoutDashboard size={18} /> },
    { label: "Proposals", href: "/underwriter/proposals", icon: <FileText size={18} /> },
    { label: "Policies", href: "/underwriter/policies", icon: <Shield size={18} /> },
  ],
  claims_officer: [
    { label: "Dashboard", href: "/claims-officer", icon: <LayoutDashboard size={18} /> },
    { label: "All Claims", href: "/claims-officer/claims", icon: <ClipboardList size={18} /> },
  ],
  assessor: [
    { label: "Dashboard", href: "/assessor", icon: <LayoutDashboard size={18} /> },
    { label: "My Assignments", href: "/assessor/assignments", icon: <UserCheck size={18} /> },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} /> },
    { label: "Users", href: "/admin/users", icon: <Users size={18} /> },
    { label: "Policy Setup", href: "/admin/document-requirements", icon: <FileText size={18} /> },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  client: "Client Portal",
  distributor: "Agent Portal",
  underwriter: "Underwriter Portal",
  claims_officer: "Claims Portal",
  assessor: "Assessor Portal",
  admin: "Admin Portal",
};

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] ?? [];

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">E-Klaims</div>
            <div className="text-gray-400 text-xs">{ROLE_LABELS[role]}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive =
            item.href === `/${role.replace("_", "-")}`
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-700">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
          <CheckCircle size={12} className="text-green-400" />
          <span>System Operational</span>
        </div>
      </div>
    </aside>
  );
}

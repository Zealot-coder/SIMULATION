"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  Activity,
  AlertTriangle,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  ChevronDown,
} from "lucide-react";
import { redirect } from "next/navigation";

const navigation = [
  { name: "Overview", href: "/dev/overview", icon: LayoutDashboard },
  { name: "Organizations", href: "/dev/organizations", icon: Building2 },
  { name: "Event Throughput", href: "/dev/events", icon: Activity },
  { name: "Failures", href: "/dev/failures", icon: AlertTriangle },
  { name: "Audit Logs", href: "/dev/audit", icon: FileText },
  { name: "System Settings", href: "/dev/settings", icon: Settings },
];

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  // Only SUPER_ADMIN can access dev console
  if (user?.role !== "SUPER_ADMIN" && user?.role !== "OWNER" && user?.role !== "ADMIN") {
    redirect("/app/overview");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-slate-950 border-r border-slate-800 text-slate-100 transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
            <Link href="/dev/overview" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <span className="font-semibold text-slate-100">DEV CONSOLE</span>
                <p className="text-xs text-slate-400">Platform Admin</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-slate-100">{user?.name || user?.email}</p>
                <p className="text-xs text-primary capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-center gap-2 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="px-2 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                asChild
              >
                <Link href="/app/overview">App</Link>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-slate-100">DEV CONSOLE</span>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

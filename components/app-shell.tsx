"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { UserButton } from "@/components/session-provider";
import { NeedsAttentionBadge } from "@/components/needs-attention-panel";
import {
  LayoutDashboard,
  Calendar,
  Workflow,
  Play,
  Users,
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Sparkles,
  Settings,
  Terminal,
  Building2,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Navigation items with icons
const mainNavItems = [
  { href: "/app/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/app/events", label: "Events", icon: Calendar },
  { href: "/app/workflows", label: "Workflows", icon: Workflow },
  { href: "/app/runs", label: "Runs", icon: Play },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/orders", label: "Orders", icon: ShoppingCart },
  { href: "/app/payments", label: "Payments", icon: CreditCard },
  { href: "/app/channels", label: "Channels", icon: MessageSquare },
  { href: "/app/ai", label: "AI Assistant", icon: Sparkles, badge: "New" },
];

const devNavItems = [
  { href: "/dev/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dev/tenants", label: "Tenants", icon: Building2 },
  { href: "/dev/errors", label: "Errors", icon: AlertCircle },
];

interface AppShellProps {
  children: React.ReactNode;
  currentOrg?: { id: string; name: string };
  attentionCount?: number;
}

function NavItem({ 
  href, 
  label, 
  icon: Icon, 
  badge,
  isActive,
  onClick 
}: { 
  href: string; 
  label: string; 
  icon: React.ElementType;
  badge?: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium",
        "transition-all duration-200 ease-out",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )} />
      <span className="flex-1">{label}</span>
      {badge && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {badge}
        </Badge>
      )}
    </Link>
  );
}

export function AppShell({ children, currentOrg, attentionCount = 0 }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isDevRoute = pathname?.startsWith("/dev");
  const isSettingsRoute = pathname?.includes("/settings");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r bg-sidebar-background fixed inset-y-0 left-0 z-30">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="font-semibold text-lg">SIMULATION</span>
            </Link>
          </div>

          {/* Organization */}
          {currentOrg && (
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-muted/50">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="text-sm font-medium truncate">{currentOrg.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Platform
            </p>
            {mainNavItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={pathname === item.href || pathname?.startsWith(`${item.href}/`)}
              />
            ))}

            {/* Divider */}
            <div className="my-4 border-t" />

            {/* Developer Section */}
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Developer
            </p>
            {devNavItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={pathname === item.href || pathname?.startsWith(`${item.href}/`)}
              />
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="border-t p-3 space-y-1">
            <NavItem
              href="/app/settings"
              label="Settings"
              icon={Settings}
              isActive={isSettingsRoute}
            />
            <button className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r transform transition-transform duration-200 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Mobile Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="font-semibold">SIMULATION</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Platform
            </p>
            {mainNavItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={pathname === item.href}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}

            <div className="my-4 border-t" />

            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Developer
            </p>
            {devNavItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={pathname === item.href}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          {/* Top Header */}
          <header className="sticky top-0 z-20 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
              {/* Left: Mobile menu & Title */}
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-lg font-semibold">
                    {isDevRoute ? "Developer Console" : currentOrg?.name || "Dashboard"}
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {isDevRoute 
                      ? "System health and tenant management" 
                      : "Manage your automation workflows"}
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {attentionCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                      {attentionCount > 9 ? "9+" : attentionCount}
                    </span>
                  )}
                </Button>

                {/* User Menu */}
                <div className="border-l pl-2 ml-1">
                  <UserButton />
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

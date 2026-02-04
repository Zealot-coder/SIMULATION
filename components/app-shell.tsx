import Link from "next/link";
import { cookies } from "next/headers";
import React from "react";
import { UserButton } from "@/components/session-provider";
import { isSuperAdmin } from "@/lib/rbac";

export function AppShell({ children, currentOrg }: { children: React.ReactNode; currentOrg?: { id: string; name: string } }) {
  // Simple org switcher uses a cookie: org_id. A dedicated component could fetch orgs the user is member of.
  return (
    <div className="min-h-screen bg-surface-50">
      <div className="flex min-h-screen">
        <aside className="w-64 hidden md:block border-r bg-white">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-lg font-semibold">Workspace</div>
            <div className="text-sm text-muted-foreground">{currentOrg?.name}</div>
          </div>
          <nav className="p-4 space-y-2">
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/overview">Overview</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/events">Events</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/workflows">Workflows</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/runs">Runs</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/customers">Customers</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/orders">Orders</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/payments">Payments</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/channels">Channels</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/ai">AI</Link>
            <Link className="block py-2 px-3 rounded hover:bg-muted" href="/app/settings">Settings</Link>
          </nav>
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground">Developer Console</div>
            <nav className="mt-2">
              <Link className="block py-2 px-3 rounded hover:bg-muted" href="/dev/overview">Overview</Link>
              <Link className="block py-2 px-3 rounded hover:bg-muted" href="/dev/tenants">Tenants</Link>
              <Link className="block py-2 px-3 rounded hover:bg-muted" href="/dev/errors">Errors</Link>
            </nav>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b bg-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2">☰</button>
              <div className="text-lg font-semibold">{currentOrg?.name || "Workspace"}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-muted-foreground">Prefers reduced motion honored</div>
              <UserButton />
            </div>
          </header>

          <main className="p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}

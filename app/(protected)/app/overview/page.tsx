"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Plus,
} from "lucide-react";
import Link from "next/link";

// Mock data for MVP - will be replaced with real API calls
const mockStats = {
  activeWorkflows: 12,
  eventsToday: 156,
  pendingOrders: 8,
  failedRuns: 2,
};

const mockRecentEvents = [
  { id: "1", type: "order_created", source: "whatsapp", timestamp: "2 min ago", status: "success" },
  { id: "2", type: "payment_received", source: "momo", timestamp: "5 min ago", status: "success" },
  { id: "3", type: "workflow_failed", source: "system", timestamp: "12 min ago", status: "error" },
  { id: "4", type: "message_received", source: "whatsapp", timestamp: "15 min ago", status: "success" },
];

const mockWorkflows = [
  { id: "1", name: "New Order Handler", status: "active", triggers: "order_created", runsToday: 23 },
  { id: "2", name: "Payment Confirmation", status: "active", triggers: "payment_received", runsToday: 18 },
  { id: "3", name: "Customer Follow-up", status: "paused", triggers: "order_fulfilled", runsToday: 0 },
];

export default function AppOverviewPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/app/workflows">
              <Zap className="w-4 h-4 mr-2" />
              Workflows
            </Link>
          </Button>
          <Button asChild>
            <Link href="/app/workflows/new">
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.eventsToday}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> vs yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Runs</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{mockStats.failedRuns}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/app/workflows?status=failed" className="text-destructive hover:underline">
                View failures
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Events</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/events">
                View all <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    event.status === "success" ? "bg-green-500" : "bg-destructive"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.type}</p>
                    <p className="text-xs text-muted-foreground">{event.source}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Workflows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Workflows</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/workflows">
                Manage <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockWorkflows.map((workflow) => (
                <div key={workflow.id} className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    workflow.status === "active" ? "bg-green-500" : "bg-amber-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{workflow.name}</p>
                    <p className="text-xs text-muted-foreground">{workflow.triggers}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{workflow.runsToday} runs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function
function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

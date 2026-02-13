"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Building2,
  AlertTriangle,
  TrendingUp,
  Server,
  ArrowRight,
  XCircle,
} from "lucide-react";
import Link from "next/link";

// Mock platform data for MVP
const mockPlatformStats = {
  totalOrganizations: 47,
  activeOrganizations: 42,
  totalEvents24h: 12547,
  failedWorkflows24h: 23,
  queueLag: "120ms",
  errorRate: "0.18%",
};

const mockTopOrganizations = [
  { id: "1", name: "TechCorp Ltd", events24h: 2341, users: 12, status: "active" },
  { id: "2", name: "ShopNow Africa", events24h: 1856, users: 8, status: "active" },
  { id: "3", name: "MediCare Clinic", events24h: 923, users: 5, status: "active" },
  { id: "4", name: "FarmFresh Co", events24h: 0, users: 3, status: "inactive" },
];

const mockRecentFailures = [
  { id: "1", workflow: "Payment Handler", organization: "TechCorp Ltd", error: "API timeout", time: "2 min ago" },
  { id: "2", workflow: "Order Processor", organization: "ShopNow Africa", error: "Database connection", time: "5 min ago" },
  { id: "3", workflow: "Notification Service", organization: "MediCare Clinic", error: "Rate limit exceeded", time: "12 min ago" },
];

export default function DevOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Platform Overview</h1>
        <p className="text-slate-400">
          System health and cross-tenant metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{mockPlatformStats.totalOrganizations}</div>
            <p className="text-xs text-green-400">
              {mockPlatformStats.activeOrganizations} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Events (24h)</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {mockPlatformStats.totalEvents24h.toLocaleString()}
            </div>
            <p className="text-xs text-green-400">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +8% vs yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Queue Lag</CardTitle>
            <Server className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{mockPlatformStats.queueLag}</div>
            <p className="text-xs text-green-400">Healthy</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{mockPlatformStats.errorRate}</div>
            <p className="text-xs text-amber-400">
              {mockPlatformStats.failedWorkflows24h} failures today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Organizations */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-100">Top Organizations</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-slate-100" asChild>
              <Link href="/dev/organizations">
                View all <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopOrganizations.map((org) => (
                <div key={org.id} className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    org.status === "active" ? "bg-green-500" : "bg-slate-600"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{org.name}</p>
                    <p className="text-xs text-slate-400">{org.users} users</p>
                  </div>
                  <span className="text-xs text-slate-400">{org.events24h.toLocaleString()} events</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Failures */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-100">Recent Failures</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-slate-100" asChild>
              <Link href="/dev/failures">
                View all <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentFailures.map((failure) => (
                <div key={failure.id} className="flex items-start gap-4">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{failure.workflow}</p>
                    <p className="text-xs text-slate-400">{failure.organization}</p>
                    <p className="text-xs text-destructive">{failure.error}</p>
                  </div>
                  <span className="text-xs text-slate-500">{failure.time}</span>
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

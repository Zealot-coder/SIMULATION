"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table";
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  Users,
  RefreshCw,
  Server,
  Database,
  Wifi,
  ChevronRight,
  Terminal,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for demonstration
interface TenantData {
  orgId: string;
  orgName: string;
  events: number;
  failures: number;
  lastActive: string;
  status: "healthy" | "warning" | "critical";
}

interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  service: string;
}

const mockTenants: (TenantData & { id: string })[] = [
  { id: "1", orgId: "org_001", orgName: "City Clinic", events: 1247, failures: 2, lastActive: "2 min ago", status: "healthy" },
  { id: "2", orgId: "org_002", orgName: "Sunrise Pharmacy", events: 892, failures: 12, lastActive: "5 min ago", status: "warning" },
  { id: "3", orgId: "org_003", orgName: "Hope NGO", events: 456, failures: 0, lastActive: "15 min ago", status: "healthy" },
  { id: "4", orgId: "org_004", orgName: "Metro School", events: 2341, failures: 45, lastActive: "1 min ago", status: "critical" },
  { id: "5", orgId: "org_005", orgName: "Local Shop", events: 123, failures: 1, lastActive: "1 hour ago", status: "healthy" },
];

const mockLogs: SystemLog[] = [
  { id: "1", timestamp: "14:32:01", level: "error", message: "Database connection timeout after 30s", service: "database" },
  { id: "2", timestamp: "14:31:45", level: "warning", message: "High memory usage detected: 85%", service: "system" },
  { id: "3", timestamp: "14:30:12", level: "info", message: "Workflow engine processed 47 events", service: "worker" },
  { id: "4", timestamp: "14:29:55", level: "info", message: "Payment webhook received from Stripe", service: "payments" },
  { id: "5", timestamp: "14:28:30", level: "warning", message: "API rate limit approaching for tenant org_002", service: "api" },
];

const tenantColumns: Column<TenantData>[] = [
  { key: "orgName", title: "Organization" },
  { key: "events", title: "Events (24h)", render: (row: TenantData) => row.events.toLocaleString() },
  { key: "failures", title: "Failures", render: (row: TenantData) => (
    <span className={cn(row.failures > 10 && "text-red-600 font-medium")}>
      {row.failures}
    </span>
  )},
  { key: "lastActive", title: "Last Active" },
  { key: "status", title: "Status", render: (row: TenantData) => (
    <StatusBadge 
      status={row.status === "healthy" ? "success" : row.status === "warning" ? "warning" : "failed"} 
    />
  )},
];

const logColumns: Column<SystemLog>[] = [
  { key: "timestamp", title: "Time", width: "80px" },
  { key: "level", title: "Level", width: "80px", render: (row: SystemLog) => (
    <span className={cn(
      "text-xs font-medium px-2 py-0.5 rounded-full",
      row.level === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      row.level === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      row.level === "info" && "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    )}>
      {row.level}
    </span>
  )},
  { key: "service", title: "Service", width: "100px" },
  { key: "message", title: "Message" },
];

export default function DevOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [systemData, setSystemData] = useState({
    errorRate: 0.02,
    queueLag: { avg_ms: 145 },
    eventsPerMinute: 1247,
    noisyTenants: mockTenants.filter(t => t.failures > 5),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Developer Console</h1>
              <StatusBadge status="success" className="text-[10px]">System Healthy</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor system health, tenant activity, and debug issues.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export Logs
            </Button>
          </div>
        </div>

        {/* System Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Error Rate"
            value={`${(systemData.errorRate * 100).toFixed(1)}%`}
            delta="-0.5%"
            trend="down"
            subtitle="last hour"
            icon={AlertTriangle}
            loading={loading}
          />
          <KpiCard
            title="Queue Lag"
            value={`${systemData.queueLag.avg_ms} ms`}
            delta="+12ms"
            trend="up"
            subtitle="average"
            icon={Clock}
            loading={loading}
          />
          <KpiCard
            title="Events/min"
            value={systemData.eventsPerMinute.toLocaleString()}
            delta="+8%"
            trend="up"
            subtitle="throughput"
            icon={Activity}
            loading={loading}
          />
          <KpiCard
            title="Active Tenants"
            value={mockTenants.length.toString()}
            subtitle="currently online"
            icon={Users}
            loading={loading}
          />
        </div>

        {/* Service Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Service Status</CardTitle>
            <CardDescription>Health check of core services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "API Gateway", icon: Wifi, status: "operational", latency: "24ms" },
                { name: "Database", icon: Database, status: "operational", latency: "12ms" },
                { name: "Worker Queue", icon: Server, status: "degraded", latency: "156ms" },
                { name: "AI Service", icon: Terminal, status: "operational", latency: "245ms" },
              ].map((service) => (
                <div 
                  key={service.name}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className={cn(
                    "p-2 rounded-md",
                    service.status === "operational" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                  )}>
                    <service.icon className={cn(
                      "h-4 w-4",
                      service.status === "operational" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs",
                        service.status === "operational" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {service.status}
                      </span>
                      <span className="text-xs text-muted-foreground">• {service.latency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tenant Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Tenant Activity</CardTitle>
                  <CardDescription>Cross-tenant event and error metrics</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={tenantColumns}
                rows={mockTenants}
                loading={loading}
                emptyState={{
                  title: "No tenants",
                  description: "No tenant data available"
                }}
              />
            </CardContent>
          </Card>

          {/* System Logs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">System Logs</CardTitle>
                  <CardDescription>Recent events and errors</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={logColumns}
                rows={mockLogs}
                loading={loading}
                maxItems={5}
                emptyState={{
                  title: "No logs",
                  description: "No system logs available"
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

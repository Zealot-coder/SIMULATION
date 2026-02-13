"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Users, Workflow, Zap, DollarSign, TrendingUp, AlertCircle, Download, Settings as SettingsIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [automations, setAutomations] = useState<any>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === "OWNER" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isAdmin) {
      setError("Admin access required");
      setLoading(false);
      return;
    }

    setError(null);
    loadAdminData();
  }, [isAdmin, user]);

  const loadAdminData = async () => {
    try {
      const [analyticsRes, aiUsageRes, automationsRes, usersRes] = await Promise.all([
        apiClient.get("/admin/analytics"),
        apiClient.get("/admin/ai-usage"),
        apiClient.get("/admin/automations"),
        apiClient.get("/admin/users?page=1&limit=10"),
      ]);

      setAnalytics(analyticsRes);
      setAiUsage(aiUsageRes);
      setAutomations(automationsRes);
      setRecentUsers(usersRes?.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !isAdmin) {
    return (
      <ProtectedRoute>
        <AdminSidebar />
        <div className="md:ml-64 min-h-screen">
          <div className="container mx-auto py-8 px-4">
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-destructive">{error || "Admin access required"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminSidebar />
      <div className="md:ml-64 min-h-screen">
        {/* Header */}
        <div className="border-b border-border bg-background/50 backdrop-blur sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-start md:items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back! Here&apos;s your system overview.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Users */}
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.users?.total || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">+{analytics?.users?.active || 0}</span> active
                </p>
              </CardContent>
            </Card>

            {/* Active Workflows */}
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Workflow className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{automations?.activeWorkflows || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {automations?.totalWorkflows || 0} total workflows
                </p>
              </CardContent>
            </Card>

            {/* AI Requests */}
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiUsage?.totalRequests || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {aiUsage?.completed || 0} completed
                </p>
              </CardContent>
            </Card>

            {/* AI Cost */}
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Cost</CardTitle>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(aiUsage?.totalCost || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {aiUsage?.totalTokens || 0} tokens used
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* System Overview */}
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Key metrics and statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-border transition-colors">
                    <p className="text-xs text-muted-foreground font-medium">Organizations</p>
                    <p className="text-2xl font-bold mt-1">{analytics?.organizations?.total || 0}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-border transition-colors">
                    <p className="text-xs text-muted-foreground font-medium">Total Events</p>
                    <p className="text-2xl font-bold mt-1">{analytics?.automations?.events || 0}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-border transition-colors">
                    <p className="text-xs text-muted-foreground font-medium">Jobs</p>
                    <p className="text-2xl font-bold mt-1">{analytics?.automations?.jobs || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Execution Statistics */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Execution Stats</CardTitle>
                <CardDescription>Performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <span className="text-sm font-bold text-green-600">
                      {((analytics?.executions?.successRate || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${(analytics?.executions?.successRate || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">Avg Execution Time</p>
                  <p className="text-lg font-bold mt-1">
                    {analytics?.executions?.averageExecutionTime
                      ? `${(analytics.executions.averageExecutionTime / 1000).toFixed(2)}s`
                      : "N/A"}
                  </p>
                </div>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">Total Executions</p>
                  <p className="text-lg font-bold mt-1">{analytics?.executions?.total || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>Quick access to admin tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/admin/users">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3 px-4 rounded-lg hover:bg-muted/50">
                    <Users className="h-4 w-4" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Manage Users</p>
                      <p className="text-xs text-muted-foreground">View and edit users</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/admin/logs">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3 px-4 rounded-lg hover:bg-muted/50">
                    <AlertCircle className="h-4 w-4" />
                    <div className="text-left">
                      <p className="font-medium text-sm">View Logs</p>
                      <p className="text-xs text-muted-foreground">System logs</p>
                    </div>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-auto py-3 px-4 rounded-lg hover:bg-muted/50"
                  onClick={async () => {
                    const data = await apiClient.get("/admin/export?format=json");
                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `analytics-${new Date().toISOString()}.json`;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Export Analytics</p>
                    <p className="text-xs text-muted-foreground">Download data</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 mt-8">
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest accounts created in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found.</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between border-b border-border/40 pb-2">
                      <div>
                        <p className="text-sm font-medium">{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || u.phone}</p>
                        <p className="text-xs text-muted-foreground">{u.email || u.phone || "No contact"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{u.role}</p>
                        <p className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

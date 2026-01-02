"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Users, Workflow, Zap, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [automations, setAutomations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "OWNER") {
      setError("Admin access required");
      setLoading(false);
      return;
    }

    loadAdminData();
  }, [user]);

  const loadAdminData = async () => {
    try {
      const [analyticsRes, aiUsageRes, automationsRes] = await Promise.all([
        apiClient.get("/admin/analytics"),
        apiClient.get("/admin/ai-usage"),
        apiClient.get("/admin/automations"),
      ]);

      setAnalytics(analyticsRes.data);
      setAiUsage(aiUsageRes.data);
      setAutomations(automationsRes.data);
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

  if (error || user?.role !== "OWNER") {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-500">{error || "Admin access required"}</p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and analytics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.users?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.users?.active || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automations?.activeWorkflows || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {automations?.totalWorkflows || 0} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {aiUsage?.totalRequests || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {aiUsage?.completed || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(aiUsage?.totalCost || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {aiUsage?.totalTokens || 0} tokens
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Organizations</p>
                  <p className="text-2xl font-bold">
                    {analytics?.organizations?.total || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">
                    {analytics?.automations?.events || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Automation Jobs</p>
                  <p className="text-2xl font-bold">
                    {analytics?.automations?.jobs || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">
                    {analytics?.executions?.total || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {((analytics?.executions?.successRate || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Execution Time</p>
                  <p className="text-2xl font-bold">
                    {analytics?.executions?.averageExecutionTime
                      ? `${(analytics.executions.averageExecutionTime / 1000).toFixed(2)}s`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/logs">
                <Button variant="outline" className="w-full">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View Logs
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const data = await apiClient.get("/admin/export?format=json");
                  const blob = new Blob([JSON.stringify(data.data, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `analytics-${new Date().toISOString()}.json`;
                  a.click();
                }}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Export Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


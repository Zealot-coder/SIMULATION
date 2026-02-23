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
  const [plans, setPlans] = useState<any[]>([]);
  const [organizationPlans, setOrganizationPlans] = useState<any[]>([]);
  const [organizationUsage, setOrganizationUsage] = useState<any[]>([]);
  const [safetyViolations, setSafetyViolations] = useState<any[]>([]);
  const [planForm, setPlanForm] = useState({
    name: "",
    maxExecutionTimeMs: 300000,
    maxStepIterations: 1000,
    maxWorkflowSteps: 100,
    maxDailyWorkflowRuns: 500,
    maxDailyMessages: 1000,
    maxDailyAiRequests: 500,
    maxConcurrentRuns: 10,
  });
  const [planActionError, setPlanActionError] = useState<string | null>(null);
  const [orgPlanDrafts, setOrgPlanDrafts] = useState<Record<string, string>>({});
  const [orgOverrideDrafts, setOrgOverrideDrafts] = useState<Record<string, string>>({});
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

  const loadGovernanceData = async () => {
    const governanceResults = await Promise.allSettled([
      apiClient.getGovernancePlans(),
      apiClient.getOrganizationPlans(),
      apiClient.getOrganizationUsage({ limit: 10 }),
      apiClient.getSafetyViolations({ limit: 10 }),
    ]);

    const [plansRes, orgPlansRes, usageRes, violationsRes] = governanceResults;
    if (plansRes.status === "fulfilled") {
      setPlans(Array.isArray(plansRes.value) ? plansRes.value : []);
    }
    if (orgPlansRes.status === "fulfilled") {
      setOrganizationPlans(Array.isArray(orgPlansRes.value) ? orgPlansRes.value : []);
    }
    if (usageRes.status === "fulfilled") {
      setOrganizationUsage(Array.isArray(usageRes.value) ? usageRes.value : []);
    }
    if (violationsRes.status === "fulfilled") {
      setSafetyViolations(Array.isArray(violationsRes.value) ? violationsRes.value : []);
    }
  };

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
      await loadGovernanceData();
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

          <Card className="border-border/50 mt-8">
            <CardHeader>
              <CardTitle>Plan Management</CardTitle>
              <CardDescription>Dynamic safety and quota limits by plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border/40 rounded-md p-3 mb-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Create Plan</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <input
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    placeholder="Plan name"
                    value={planForm.name}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    type="number"
                    placeholder="Max runtime ms"
                    value={planForm.maxExecutionTimeMs}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxExecutionTimeMs: Number(e.target.value || 0) }))}
                  />
                  <input
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    type="number"
                    placeholder="Max iterations"
                    value={planForm.maxStepIterations}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxStepIterations: Number(e.target.value || 0) }))}
                  />
                  <input
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    type="number"
                    placeholder="Max workflow steps"
                    value={planForm.maxWorkflowSteps}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxWorkflowSteps: Number(e.target.value || 0) }))}
                  />
                  <input
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    type="number"
                    placeholder="Daily runs"
                    value={planForm.maxDailyWorkflowRuns}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxDailyWorkflowRuns: Number(e.target.value || 0) }))}
                  />
                  <input
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    type="number"
                    placeholder="Daily messages"
                    value={planForm.maxDailyMessages}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxDailyMessages: Number(e.target.value || 0) }))}
                  />
                  <input
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    type="number"
                    placeholder="Daily AI requests"
                    value={planForm.maxDailyAiRequests}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxDailyAiRequests: Number(e.target.value || 0) }))}
                  />
                  <div className="flex gap-2">
                    <input
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                      type="number"
                      placeholder="Concurrent runs"
                      value={planForm.maxConcurrentRuns}
                      onChange={(e) => setPlanForm((prev) => ({ ...prev, maxConcurrentRuns: Number(e.target.value || 0) }))}
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          setPlanActionError(null);
                          await apiClient.createGovernancePlan(planForm);
                          setPlanForm({
                            name: "",
                            maxExecutionTimeMs: 300000,
                            maxStepIterations: 1000,
                            maxWorkflowSteps: 100,
                            maxDailyWorkflowRuns: 500,
                            maxDailyMessages: 1000,
                            maxDailyAiRequests: 500,
                            maxConcurrentRuns: 10,
                          });
                          await loadGovernanceData();
                        } catch (err: any) {
                          setPlanActionError(err?.response?.data?.message || "Failed to create plan");
                        }
                      }}
                    >
                      Create
                    </Button>
                  </div>
                </div>
                {planActionError && (
                  <p className="text-xs text-destructive mt-2">{planActionError}</p>
                )}
              </div>

              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans configured.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground">
                        <th className="text-left py-2 pr-4">Plan</th>
                        <th className="text-left py-2 pr-4">Max Runtime</th>
                        <th className="text-left py-2 pr-4">Max Steps</th>
                        <th className="text-left py-2 pr-4">Max Iterations</th>
                        <th className="text-left py-2 pr-4">Daily Runs</th>
                        <th className="text-left py-2 pr-4">Daily Messages</th>
                        <th className="text-left py-2 pr-4">Daily AI</th>
                        <th className="text-left py-2 pr-4">Concurrent</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((plan) => (
                        <tr key={plan.id} className="border-b border-border/20">
                          <td className="py-2 pr-4 font-medium capitalize">{plan.name}</td>
                          <td className="py-2 pr-4">{Math.round((plan.maxExecutionTimeMs || 0) / 1000)}s</td>
                          <td className="py-2 pr-4">{plan.maxWorkflowSteps}</td>
                          <td className="py-2 pr-4">{plan.maxStepIterations}</td>
                          <td className="py-2 pr-4">{plan.maxDailyWorkflowRuns}</td>
                          <td className="py-2 pr-4">{plan.maxDailyMessages}</td>
                          <td className="py-2 pr-4">{plan.maxDailyAiRequests}</td>
                          <td className="py-2 pr-4">{plan.maxConcurrentRuns}</td>
                          <td className="py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const editable = {
                                  maxExecutionTimeMs: plan.maxExecutionTimeMs,
                                  maxStepIterations: plan.maxStepIterations,
                                  maxWorkflowSteps: plan.maxWorkflowSteps,
                                  maxDailyWorkflowRuns: plan.maxDailyWorkflowRuns,
                                  maxDailyMessages: plan.maxDailyMessages,
                                  maxDailyAiRequests: plan.maxDailyAiRequests,
                                  maxConcurrentRuns: plan.maxConcurrentRuns,
                                };
                                const raw = window.prompt(
                                  `Update limits for ${plan.name} as JSON`,
                                  JSON.stringify(editable, null, 2),
                                );
                                if (!raw) return;
                                try {
                                  setPlanActionError(null);
                                  const parsed = JSON.parse(raw);
                                  await apiClient.updateGovernancePlan(plan.id, parsed);
                                  await loadGovernanceData();
                                } catch (err: any) {
                                  setPlanActionError(err?.response?.data?.message || "Failed to update plan");
                                }
                              }}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 mt-8">
            <CardHeader>
              <CardTitle>Organization Usage</CardTitle>
              <CardDescription>Daily consumption and active concurrency by organization</CardDescription>
            </CardHeader>
            <CardContent>
              {organizationUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No usage counters yet.</p>
              ) : (
                <div className="space-y-2">
                  {organizationUsage.map((usage) => {
                    const assigned = organizationPlans.find((row) => row.organizationId === usage.organizationId);
                    const selectedPlanId = orgPlanDrafts[usage.organizationId] || assigned?.planId || "";
                    const overrideDraft = orgOverrideDrafts[usage.organizationId] || "";

                    return (
                    <div key={`${usage.organizationId}-${usage.date}`} className="border border-border/40 rounded-md p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {usage.organization?.name || usage.organizationId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(usage.date).toLocaleDateString()} | Runs {usage.workflowRunsCount} | Messages {usage.messagesSentCount} | AI {usage.aiRequestsCount} | Concurrent {usage.concurrentRunsCurrent}
                        </p>
                      </div>
                      <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2">
                        <select
                          className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                          value={selectedPlanId}
                          onChange={(e) => setOrgPlanDrafts((prev) => ({ ...prev, [usage.organizationId]: e.target.value }))}
                        >
                          <option value="">Select plan</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                          placeholder='Override JSON (optional), e.g. {"maxConcurrentRuns":5}'
                          value={overrideDraft}
                          onChange={(e) => setOrgOverrideDrafts((prev) => ({ ...prev, [usage.organizationId]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setPlanActionError(null);
                                if (!selectedPlanId) {
                                  setPlanActionError("Select a plan before assigning.");
                                  return;
                                }
                                let parsedOverride: Record<string, unknown> | undefined = undefined;
                                if (overrideDraft.trim()) {
                                  parsedOverride = JSON.parse(overrideDraft);
                                }
                                await apiClient.assignOrganizationPlan(usage.organizationId, {
                                  planId: selectedPlanId,
                                  ...(parsedOverride ? { overrideConfig: parsedOverride } : {}),
                                });
                                await loadGovernanceData();
                              } catch (err: any) {
                                setPlanActionError(err?.response?.data?.message || "Failed to assign organization plan");
                              }
                            }}
                          >
                            Assign Plan
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await apiClient.resetOrganizationUsage(usage.organizationId, {
                                date: usage.date,
                                resetConcurrent: false,
                              });
                              await loadGovernanceData();
                            }}
                          >
                            Reset Counters
                          </Button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {planActionError && (
                <p className="text-xs text-destructive mt-3">{planActionError}</p>
              )}

              {organizationPlans.length > 0 && (
                <div className="mt-6 border-t border-border/30 pt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Assigned Plans</p>
                  <div className="space-y-2">
                    {organizationPlans.map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-sm">
                        <span>{row.organization?.name || row.organizationId}</span>
                        <span className="px-2 py-1 rounded bg-muted text-muted-foreground capitalize">{row.plan?.name || "unassigned"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 mt-8">
            <CardHeader>
              <CardTitle>Safety Violations</CardTitle>
              <CardDescription>Latest workflow safety limit breaches and system actions</CardDescription>
            </CardHeader>
            <CardContent>
              {safetyViolations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No safety violations recorded.</p>
              ) : (
                <div className="space-y-2">
                  {safetyViolations.map((violation) => (
                    <div key={violation.id} className="border border-border/40 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{violation.organization?.name || violation.organizationId}</p>
                        <span className="px-2 py-1 rounded text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {violation.limitCode}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Workflow {violation.workflow?.name || violation.workflowId || "n/a"} | Execution {violation.workflowExecutionId || "n/a"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Action: {violation.actionTaken} | {new Date(violation.createdAt).toLocaleString()}
                      </p>
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

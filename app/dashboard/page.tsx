"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LayoutDashboard,
  Workflow,
  Calendar,
  MessageSquare,
  Settings,
  Plus,
  LogOut,
  Building2,
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const orgs = await apiClient.getMyOrganizations();
      setOrganizations(orgs);
      
      if (orgs.length > 0) {
        const orgWorkflows = await apiClient.getWorkflows(orgs[0].id);
        setWorkflows(orgWorkflows);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.firstName || user?.email || "User"}
                </p>
              </div>
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Stats Cards */}
              <div className="bg-background border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Organizations</p>
                    <p className="text-3xl font-bold mt-2">{organizations.length}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="bg-background border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Workflows</p>
                    <p className="text-3xl font-bold mt-2">{workflows.length}</p>
                  </div>
                  <Workflow className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="bg-background border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Events</p>
                    <p className="text-3xl font-bold mt-2">-</p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="bg-background border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Messages</p>
                    <p className="text-3xl font-bold mt-2">-</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/dashboard/workflows/new">
              <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create Workflow</h3>
                    <p className="text-sm text-muted-foreground">Automate your processes</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/organizations/new">
              <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">New Organization</h3>
                    <p className="text-sm text-muted-foreground">Create a workspace</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/events/new">
              <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create Event</h3>
                    <p className="text-sm text-muted-foreground">Trigger workflows</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Workflows */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Workflows</h2>
              <Link href="/dashboard/workflows">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            {workflows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No workflows yet. Create your first workflow to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workflows.slice(0, 5).map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium">{workflow.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {workflow.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          workflow.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {workflow.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


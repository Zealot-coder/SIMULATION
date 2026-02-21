"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

function canAccessDlq(role?: string) {
  return role === "OWNER" || role === "SUPER_ADMIN" || role === "ADMIN" || role === "ORG_ADMIN";
}

function mapDlqStatus(status?: string): "running" | "success" | "failed" | "pending" | "idle" | "warning" {
  switch ((status || "").toUpperCase()) {
    case "OPEN":
      return "failed";
    case "REPLAYING":
      return "running";
    case "RESOLVED":
      return "success";
    case "IGNORED":
      return "warning";
    default:
      return "idle";
  }
}

export default function DlqListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    organizationId: "",
    stepType: "",
    errorCategory: "",
    status: "",
    from: "",
    to: "",
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: any = await apiClient.getDlqItems({
        ...filters,
        limit: 50,
      });
      setItems(response.items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load DLQ items");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!canAccessDlq(user?.role)) {
      setLoading(false);
      setError("Access denied: OWNER/ADMIN required");
      return;
    }

    loadItems();
  }, [loadItems, user?.role]);

  if (!canAccessDlq(user?.role)) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">Access denied.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DLQ Management</h1>
        <p className="text-sm text-muted-foreground">Inspect workflow step failures, replay, resolve, or ignore.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input placeholder="Organization ID" value={filters.organizationId} onChange={(e) => setFilters((prev) => ({ ...prev, organizationId: e.target.value }))} />
            <Input placeholder="Step Type" value={filters.stepType} onChange={(e) => setFilters((prev) => ({ ...prev, stepType: e.target.value }))} />
            <Input placeholder="Error Category" value={filters.errorCategory} onChange={(e) => setFilters((prev) => ({ ...prev, errorCategory: e.target.value }))} />
            <Input placeholder="Status" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} />
            <Input placeholder="From (ISO)" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} />
            <Input placeholder="To (ISO)" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} />
          </div>
          <div className="pt-3">
            <Button onClick={loadItems} disabled={loading}>{loading ? "Loading..." : "Apply Filters"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading DLQ items...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No DLQ items found.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/app/admin/dlq/${item.id}`}
                  className="block rounded-md border border-border px-3 py-3 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.stepType}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.failureReason}</p>
                      <p className="text-xs text-muted-foreground">Run: {item.workflowExecutionId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={mapDlqStatus(item.status)}>{item.status}</StatusBadge>
                      <span className="text-xs text-muted-foreground">Attempts: {item.attemptCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

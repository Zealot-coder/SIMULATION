"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { DlqReplayModal } from "@/components/dlq-replay-modal";

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

export default function DlqDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [replayOpen, setReplayOpen] = useState(false);

  const loadItem = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getDlqItem(params.id);
      setItem(response);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load DLQ item");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!canAccessDlq(user?.role)) {
      setLoading(false);
      setError("Access denied");
      return;
    }

    loadItem();
  }, [loadItem, user?.role]);

  const resolveItem = async () => {
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.resolveDlqItem(params.id, reason.trim());
      setReason("");
      await loadItem();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resolve item");
    } finally {
      setActionLoading(false);
    }
  };

  const ignoreItem = async () => {
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.ignoreDlqItem(params.id, reason.trim());
      setReason("");
      await loadItem();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to ignore item");
    } finally {
      setActionLoading(false);
    }
  };

  const replayItem = async (payload: any) => {
    setActionLoading(true);
    setError(null);

    try {
      await apiClient.replayDlqItem(params.id, payload);
      setReplayOpen(false);
      await loadItem();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to replay item");
    } finally {
      setActionLoading(false);
    }
  };

  if (!canAccessDlq(user?.role)) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">Access denied.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DLQ Item</h1>
          <p className="text-sm text-muted-foreground">Inspect error payload, replay, resolve, or ignore.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/app/admin/dlq")}>Back</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : !item ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Item not found.</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>{item.stepType}</span>
                <StatusBadge status={mapDlqStatus(item.status)}>{item.status}</StatusBadge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Organization:</strong> {item.organizationId}</p>
              <p><strong>Workflow Run:</strong> {item.workflowExecutionId}</p>
              <p><strong>Step:</strong> {item.workflowStep?.stepIndex} ({item.workflowStepId})</p>
              <p><strong>Error Category:</strong> {item.errorCategory}</p>
              <p><strong>Attempts:</strong> {item.attemptCount}</p>
              <p><strong>First Failed:</strong> {new Date(item.firstFailedAt).toLocaleString()}</p>
              <p><strong>Last Failed:</strong> {new Date(item.lastFailedAt).toLocaleString()}</p>
              <p><strong>Correlation ID:</strong> {item.correlationId || "N/A"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Failure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="max-h-48 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{item.failureReason}</pre>
              <pre className="max-h-72 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{item.errorStack || "No stack trace"}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payload Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="max-h-72 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{JSON.stringify(item.inputPayload, null, 2)}</pre>
              <pre className="max-h-72 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{JSON.stringify(item.stepConfigSnapshot, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setReplayOpen(true)} disabled={actionLoading}>Replay</Button>
                <Button variant="outline" asChild>
                  <Link href="/app/workflows">Open Workflows</Link>
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Reason for resolve/ignore"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="md:col-span-2"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resolveItem} disabled={actionLoading}>Resolve</Button>
                  <Button variant="outline" onClick={ignoreItem} disabled={actionLoading}>Ignore</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <DlqReplayModal
        open={replayOpen}
        defaultStepIndex={item?.workflowStep?.stepIndex ?? 0}
        loading={actionLoading}
        onClose={() => setReplayOpen(false)}
        onSubmit={replayItem}
      />
    </div>
  );
}

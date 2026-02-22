"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

function getIdempotencyMetadata(log: AuditRow) {
  const metadata = (log.metadata || {}) as Record<string, unknown>;
  const idempotency = (metadata.idempotency || metadata) as Record<string, unknown>;
  const key = typeof idempotency.key === "string" ? idempotency.key : undefined;
  const status = typeof idempotency.status === "string" ? idempotency.status : undefined;
  const scope = typeof idempotency.scope === "string" ? idempotency.scope : undefined;
  return { key, status, scope };
}

export default function DevAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getAdminLogs({ limit: 100 });
        if (!active) return;
        setLogs(Array.isArray(data) ? (data as AuditRow[]) : []);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load audit logs");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const idempotencyLogs = useMemo(
    () => logs.filter((log) => Boolean(getIdempotencyMetadata(log).key)),
    [logs],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Audit Logs</h1>
        <p className="text-slate-400">Platform audit trail</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-slate-400">Loading logs...</div>
          ) : error ? (
            <div className="py-8 text-red-400">{error}</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-slate-200">No Logs Found</h3>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-200">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-800">
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">Entity</th>
                      <th className="py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-900 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3">{log.action}</td>
                        <td className="py-2 pr-3">{log.entityType}</td>
                        <td className="py-2">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-slate-100 font-medium mb-2">Idempotency Metadata</h3>
                {idempotencyLogs.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No idempotency metadata in current log sample.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-slate-200">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-2 pr-3">Time</th>
                          <th className="py-2 pr-3">Key</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2">Scope</th>
                        </tr>
                      </thead>
                      <tbody>
                        {idempotencyLogs.map((log) => {
                          const meta = getIdempotencyMetadata(log);
                          return (
                            <tr key={`idemp-${log.id}`} className="border-b border-slate-900 align-top">
                              <td className="py-2 pr-3 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2 pr-3">{meta.key || "-"}</td>
                              <td className="py-2 pr-3">{meta.status || "-"}</td>
                              <td className="py-2">{meta.scope || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

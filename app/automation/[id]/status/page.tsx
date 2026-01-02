"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AutomationStatusPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await apiClient.get(`/automation/${jobId}/status`);
        setJob(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load job status");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobId]);

  const getStatusIcon = () => {
    switch (job?.status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-8 w-8 text-red-500" />;
      case "RUNNING":
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (job?.status) {
      case "COMPLETED":
        return "text-green-600";
      case "FAILED":
        return "text-red-600";
      case "RUNNING":
        return "text-blue-600";
      default:
        return "text-yellow-600";
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

  if (error || !job) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-500">{error || "Job not found"}</p>
              <Link href="/automation/create">
                <Button className="mt-4">Create New Automation</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/automation/history">
            <Button variant="ghost">← Back to History</Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Automation Status</CardTitle>
                <CardDescription>{job.taskDescription}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className={`font-semibold ${getStatusColor()}`}>
                  {job.status}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{new Date(job.createdAt).toLocaleString()}</p>
              </div>
              {job.startedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p>{new Date(job.startedAt).toLocaleString()}</p>
                </div>
              )}
              {job.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p>{new Date(job.completedAt).toLocaleString()}</p>
                </div>
              )}
              {job.executionTime && (
                <div>
                  <p className="text-sm text-muted-foreground">Execution Time</p>
                  <p>{(job.executionTime / 1000).toFixed(2)} seconds</p>
                </div>
              )}
              {job.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-semibold text-red-700">Error:</p>
                  <p className="text-sm text-red-600">{job.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {job.executionLogs && job.executionLogs.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {job.executionLogs.map((log: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${
                      log.status === "error"
                        ? "bg-red-50 border-red-200"
                        : log.status === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{log.step}</p>
                        <p className="text-sm text-muted-foreground">{log.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {job.status === "COMPLETED" && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                {JSON.stringify(job.result, null, 2)}
              </pre>
              <Link href={`/automation/${jobId}/result`}>
                <Button className="mt-4">View Full Result</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}


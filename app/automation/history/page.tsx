"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AutomationHistoryPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await apiClient.get("/automation/history");
      setJobs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "RUNNING":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">
              Automation History
            </h1>
            <p className="text-muted-foreground">
              View all your automation jobs and their status
            </p>
          </div>
          <Link href="/automation/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Automation
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No automation jobs yet</p>
              <Link href="/automation/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Automation
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(job.status)}
                        <h3 className="font-semibold">{job.taskDescription}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Created: {new Date(job.createdAt).toLocaleString()}
                      </p>
                      {job.workflow && (
                        <p className="text-sm text-muted-foreground">
                          Workflow: {job.workflow.name}
                        </p>
                      )}
                    </div>
                    <Link href={`/automation/${job.id}/status`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}



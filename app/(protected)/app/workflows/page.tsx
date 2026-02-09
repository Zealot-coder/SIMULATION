"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow, Plus } from "lucide-react";
import Link from "next/link";

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Automation workflows and their runs
          </p>
        </div>
        <Button asChild>
          <Link href="/app/workflows/new">
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Workflow className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Create your first workflow to automate tasks like order processing,
              payment confirmations, and customer notifications.
            </p>
            <Button asChild>
              <Link href="/app/workflows/new">Create Workflow</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

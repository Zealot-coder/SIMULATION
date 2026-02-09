"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function DevEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Event Throughput</h1>
        <p className="text-slate-400">Cross-tenant event metrics</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Platform Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-slate-200">Event Metrics</h3>
            <p className="text-slate-400 max-w-md">
              Monitor event throughput across all organizations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

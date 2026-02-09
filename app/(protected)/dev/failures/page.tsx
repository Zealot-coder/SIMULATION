"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function DevFailuresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Failures</h1>
        <p className="text-slate-400">Platform-wide failure tracking</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Recent Failures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-slate-200">Failure Tracking</h3>
            <p className="text-slate-400 max-w-md">
              View and analyze workflow failures across the platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

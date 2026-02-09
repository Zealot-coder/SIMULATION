"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function DevAuditPage() {
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-slate-200">Audit Logs</h3>
            <p className="text-slate-400 max-w-md">
              View platform-wide audit logs and changes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

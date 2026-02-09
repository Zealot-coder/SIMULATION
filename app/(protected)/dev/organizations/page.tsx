"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

export default function DevOrganizationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Organizations</h1>
          <p className="text-slate-400">Manage platform organizations</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Organization
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-slate-200">Organization Management</h3>
            <p className="text-slate-400 max-w-md">
              View and manage all organizations on the platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

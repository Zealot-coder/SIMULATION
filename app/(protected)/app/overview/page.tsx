"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { EventStream, EventStreamItem } from "@/components/event-stream";
import { NeedsAttentionPanel, AttentionItem } from "@/components/needs-attention-panel";
import { AiAssistantPanel, AiSuggestion } from "@/components/ai-assistant-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  CalendarDays, 
  AlertCircle, 
  CreditCard, 
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Zap,
  Plus
} from "lucide-react";
import Link from "next/link";

// Mock data for demonstration
const mockEvents: EventStreamItem[] = [
  { id: "1", type: "workflow", title: "Patient reminder sent", description: "WhatsApp message delivered to John Doe", status: "success", timestamp: "2 min ago" },
  { id: "2", type: "payment", title: "Payment received", description: "TZS 150,000 from ABC Clinic", status: "success", timestamp: "15 min ago" },
  { id: "3", type: "workflow", title: "Inventory check", description: "Low stock alert triggered", status: "running", timestamp: "32 min ago" },
  { id: "4", type: "customer", title: "New patient registered", description: "Jane Smith added to system", status: "success", timestamp: "1 hour ago" },
  { id: "5", type: "system", title: "Daily backup completed", description: "All data synced to cloud", status: "success", timestamp: "2 hours ago" },
];

const mockAttentionItems: AttentionItem[] = [
  { id: "1", type: "workflow", severity: "critical", title: "Payment workflow failed", description: "3 consecutive failures detected in payment processing workflow. Check integration settings.", timestamp: "10 min ago", action: { label: "Fix Now", href: "/app/workflows/1" } },
  { id: "2", type: "payment", severity: "warning", title: "Pending payment approval", description: "Large transaction awaiting manual approval from administrator.", timestamp: "1 hour ago", action: { label: "Review", href: "/app/payments" } },
];

const mockAiSuggestions: AiSuggestion[] = [
  { id: "1", type: "improvement", title: "Optimize reminder timing", description: "Patient reminders sent at 9 AM have 40% higher response rate. Consider adjusting your schedule.", action: { label: "Apply", onClick: () => {} } },
  { id: "2", type: "warning", title: "High failure rate detected", description: "Your payment workflow has failed 3 times today. Check your payment provider settings.", action: { label: "Investigate", onClick: () => {} } },
  { id: "3", type: "tip", title: "New AI feature available", description: "Voice input is now available for patient registrations. Enable it in your workflow settings.", action: { label: "Learn More", onClick: () => {} } },
];

interface OverviewData {
  kpis: {
    events_today: number;
    failed_runs: number;
    pending_payments: number;
    success_rate: number;
  };
  recent_events: EventStreamItem[];
  failing_runs: any[];
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData>({
    kpis: { events_today: 0, failed_runs: 0, pending_payments: 0, success_rate: 0 },
    recent_events: [],
    failing_runs: []
  });

  // Simulate data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        kpis: {
          events_today: 47,
          failed_runs: 3,
          pending_payments: 5,
          success_rate: 98.5,
        },
        recent_events: mockEvents,
        failing_runs: [{ id: "1", workflow: "Payment Processing", error: "API timeout" }],
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <AppShell currentOrg={{ id: "demo", name: "Demo Organization" }} attentionCount={2}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back! Here&apos;s what&apos;s happening with your organization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/app/workflows/new">
                <Plus className="h-4 w-4" />
                New Workflow
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Events Today"
            value={data.kpis.events_today || "—"}
            delta="+12%"
            trend="up"
            subtitle="vs yesterday"
            icon={CalendarDays}
            loading={loading}
          />
          <KpiCard
            title="Failed Runs"
            value={data.kpis.failed_runs || "—"}
            delta="-2"
            trend="down"
            subtitle="needs attention"
            icon={AlertCircle}
            loading={loading}
          />
          <KpiCard
            title="Pending Payments"
            value={data.kpis.pending_payments || "—"}
            subtitle="awaiting approval"
            icon={CreditCard}
            loading={loading}
          />
          <KpiCard
            title="Success Rate"
            value={data.kpis.success_rate ? `${data.kpis.success_rate}%` : "—"}
            delta="+1.2%"
            trend="up"
            subtitle="last 24 hours"
            icon={TrendingUp}
            loading={loading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Event Stream */}
          <div className="lg:col-span-2 space-y-6">
            <EventStream 
              items={data.recent_events} 
              loading={loading}
              onRefresh={handleRefresh}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>Common tasks to get you started</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Zap, label: "Create Workflow", href: "/app/workflows/new" },
                    { icon: CalendarDays, label: "Schedule Event", href: "/app/events/new" },
                    { icon: CreditCard, label: "View Payments", href: "/app/payments" },
                  ].map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <action.icon className="h-4 w-4 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <span className="text-sm font-medium flex-1">{action.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Side Panels */}
          <div className="space-y-6">
            {/* Needs Attention */}
            <NeedsAttentionPanel 
              items={mockAttentionItems} 
              loading={loading}
            />

            {/* AI Assistant */}
            <AiAssistantPanel
              summary={{
                title: "Today's Summary",
                metrics: [
                  { label: "Tasks Completed", value: "24", change: "+8" },
                  { label: "Time Saved", value: "3.2h", change: "+0.5h" },
                  { label: "Efficiency", value: "94%", change: "+2%" },
                ]
              }}
              suggestions={mockAiSuggestions}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}



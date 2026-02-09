"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FeatureCard } from "@/components/feature-card";
import { KpiCard } from "@/components/kpi-card";
import { cn } from "@/lib/utils";
import {
  FileText,
  Clock,
  Users,
  Zap,
  MessageSquare,
  Shield,
  Globe,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Sparkles,
  Workflow,
  Lock,
} from "lucide-react";

// Lazy load Hero component
const Hero = dynamic(() => import("@/components/hero").then(mod => ({ default: mod.Hero })), {
  loading: () => <div className="h-screen bg-gradient-to-b from-background to-muted/20" />,
});

// Section header component
function SectionHeader({ 
  title, 
  subtitle, 
  className,
  align = "center" 
}: { 
  title: string; 
  subtitle: string;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div className={cn(
      "mb-12",
      align === "center" && "text-center",
      align === "left" && "text-left",
      align === "right" && "text-right",
      className
    )}>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 animate-fade-up">
        {title}
      </h2>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
        {subtitle}
      </p>
    </div>
  );
}

// Step card component for How It Works
function StepCard({ 
  number, 
  icon: Icon, 
  title, 
  description, 
  delay = 0,
  align = "left" 
}: { 
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
  align?: "left" | "right";
}) {
  return (
    <div 
      className={cn(
        "relative flex gap-6 animate-fade-up",
        align === "right" && "flex-row-reverse text-right"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Number and line */}
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25">
          {number}
        </div>
        <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/50 to-transparent mt-4" />
      </div>
      
      {/* Content */}
      <div className={cn("flex-1 pb-12", align === "right" && "items-end")}>
        <div className={cn(
          "inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4",
          align === "right" && "ml-auto"
        )}>
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed max-w-md">
          {description}
        </p>
      </div>
    </div>
  );
}

// Feature highlight card
function FeatureHighlight({ 
  icon: Icon, 
  title, 
  features, 
  delay = 0 
}: { 
  icon: React.ElementType;
  title: string;
  features: string[];
  delay?: number;
}) {
  return (
    <div 
      className="group p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        <Icon className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
      </div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Stats section
function StatsSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <KpiCard
            title="Active Workflows"
            value="2,847"
            delta="+12%"
            trend="up"
            className="animate-fade-up"
          />
          <KpiCard
            title="Tasks Automated"
            value="1.2M"
            delta="+28%"
            trend="up"
            className="animate-fade-up"
            style={{ animationDelay: "100ms" }}
          />
          <KpiCard
            title="Time Saved"
            value="48K hrs"
            delta="+15%"
            trend="up"
            className="animate-fade-up"
            style={{ animationDelay: "200ms" }}
          />
          <KpiCard
            title="Success Rate"
            value="99.7%"
            delta="+0.3%"
            trend="up"
            className="animate-fade-up"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </section>
  );
}

// CTA Block
function CTABlock() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 animate-fade-up">
          Ready to Simplify Your Workflow?
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
          Join small businesses, clinics, and NGOs who are already saving hours every day 
          with invisible automation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "200ms" }}>
          <Link 
            href="/auth/sign-up"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link 
            href="/automation"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border bg-background font-medium hover:bg-muted transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />

      {/* Problem Section */}
      <section id="problem" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="The Real Pain Points"
            subtitle="Small businesses, clinics, and NGOs face daily challenges that drain time and resources."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={FileText}
              title="Paperwork Overload"
              description="Manual forms, patient records, and inventory tracking consume hours every day. Mistakes are costly and time-consuming to fix."
              delay={0.1}
            />
            <FeatureCard
              icon={Clock}
              title="Missed Follow-ups"
              description="Appointments slip through the cracks. Patients don't get reminders. Important tasks get forgotten in the daily rush."
              delay={0.2}
            />
            <FeatureCard
              icon={Users}
              title="Manual Communication"
              description="Calling each patient, sending individual messages, and managing customer inquiries manually is exhausting and inefficient."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* Solution Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Simple Automation, Real Results"
            subtitle="No complex dashboards. No training required. Just tell us what you need, and AI handles the rest."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureHighlight
              icon={Workflow}
              title="Workflow Automation"
              features={[
                "Automate repetitive tasks without coding",
                "Connect your existing tools and systems",
                "Set up triggers and actions visually"
              ]}
              delay={100}
            />
            <FeatureHighlight
              icon={MessageSquare}
              title="Smart Communication"
              features={[
                "WhatsApp and SMS integration",
                "Voice-to-text automation",
                "Automated follow-ups and reminders"
              ]}
              delay={200}
            />
            <FeatureHighlight
              icon={BarChart3}
              title="Insights & Analytics"
              features={[
                "Track automation performance",
                "Identify bottlenecks quickly",
                "Export reports for stakeholders"
              ]}
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="How It Works"
            subtitle="Three simple steps from input to output. The AI disappears, only the result remains."
          />

          <div className="mt-16">
            <StepCard
              number="1"
              icon={MessageSquare}
              title="You Speak or Type"
              description="Use WhatsApp, voice, or simple forms. No technical knowledge needed. Just communicate naturally in your preferred language."
              delay={100}
            />
            <StepCard
              number="2"
              icon={Sparkles}
              title="AI Understands & Acts"
              description="Our AI processes your request, extracts the important information, and takes the right action automatically. No manual setup required."
              delay={200}
              align="right"
            />
            <StepCard
              number="3"
              icon={Shield}
              title="Simple Output"
              description="You get a confirmation, a reminder sent, a record updated, or a task completed. No complexity, just results you can trust."
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Why Africa Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Why Africa → Why the World"
            subtitle="Constraint-driven innovation creates solutions that work everywhere."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeatureCard
              icon={Globe}
              title="Built for Constraints"
              description="Designed for low bandwidth, mobile-first users, and non-technical teams. If it works in Tanzania, it works anywhere."
              delay={0.1}
            />
            <FeatureCard
              icon={Lock}
              title="Trust & Simplicity First"
              description="No dark patterns. No complexity. Just clear value. This approach scales globally because it respects users everywhere."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by organizations across East Africa
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            {["Clinic", "Pharmacy", "School", "NGO", "Shop"].map((org) => (
              <div key={org} className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <span className="text-xs">{org[0]}</span>
                </div>
                {org}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CTABlock />
    </>
  );
}

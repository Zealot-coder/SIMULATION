"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Mic, Play, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Animated background component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
    </div>
  );
}

// Feature badge component
function FeatureBadge({ icon: Icon, children, delay = 0 }: { icon: React.ElementType; children: React.ReactNode; delay?: number }) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-background/80 backdrop-blur-sm border shadow-sm",
        "animate-fade-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

// Stats component
function HeroStats() {
  const stats = [
    { value: "10K+", label: "Automations Run" },
    { value: "500+", label: "Businesses Served" },
    { value: "99.9%", label: "Uptime" },
  ];

  return (
    <div className="flex items-center justify-center gap-8 sm:gap-12 mt-12 animate-fade-up" style={{ animationDelay: "600ms" }}>
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <AnimatedBackground />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Pre-title badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-sm font-medium text-primary">Now available in Tanzania</span>
          </div>

          {/* Main headline */}
          <h1 className="animate-fade-up">
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
              Automation Toward
            </span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="relative">
                <span className="text-gradient">Simplicity</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path 
                    d="M2 8C50 2 150 2 198 8" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    className="animate-pulse-subtle"
                  />
                </svg>
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            AI that removes friction, not adds complexity. Built for small businesses, 
            clinics, and NGOs in Tanzania and beyond.
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fade-up"
            style={{ animationDelay: "400ms" }}
          >
            <Button 
              asChild 
              size="lg" 
              className="text-base px-8 py-6 h-auto gap-2 group animate-pulse-subtle"
            >
              <Link href="#how-it-works">
                See How It Works
                <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="text-base px-8 py-6 h-auto"
            >
              <Link href="/use-cases">Explore Use Cases</Link>
            </Button>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <FeatureBadge icon={MessageCircle} delay={500}>WhatsApp</FeatureBadge>
            <FeatureBadge icon={Mic} delay={600}>Voice</FeatureBadge>
            <FeatureBadge icon={Play} delay={700}>Low-friction AI</FeatureBadge>
          </div>

          {/* Stats */}
          <HeroStats />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <Link 
          href="#problem" 
          className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-xs font-medium uppercase tracking-wider">Scroll</span>
          <ChevronDown className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

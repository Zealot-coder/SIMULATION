"use client";

import { motion } from "framer-motion";
import { FeatureCard } from "@/components/feature-card";
import { CTABlock } from "@/components/cta-block";
import {
  Globe,
  Heart,
  Target,
  Users,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              Our Vision
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Building AI automation that works for Africa, and scales to the world.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Africa-First Vision */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                Africa-First Innovation
              </h2>
            </div>
            <div className="max-w-3xl space-y-4 text-lg text-muted-foreground">
              <p>
                We believe the best solutions come from understanding real constraints. In Tanzania and across Africa, we face unique challenges:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <span>Mobile-first users who may not have desktop computers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <span>Variable internet connectivity and bandwidth limitations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <span>Non-technical users who need solutions that just work</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <span>Multilingual environments (Swahili, English, local languages)</span>
                </li>
              </ul>
              <p className="pt-4">
                By building for these constraints, we create solutions that are robust, accessible, and truly useful. And if it works in Africa, it works anywhere in the world.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Human-Centered AI */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                Human-Centered AI
              </h2>
            </div>
            <div className="max-w-3xl space-y-4 text-lg text-muted-foreground">
              <p>
                AI should augment human capabilities, not replace human judgment. Our approach:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Sparkles className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">AI handles the routine</strong>
                    <p className="mt-1">Automated tasks, reminders, data entry—the repetitive work that drains time and energy.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Sparkles className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">Humans make the decisions</strong>
                    <p className="mt-1">Complex choices, relationship building, creative problem-solving—the work that requires human insight.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Sparkles className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">Transparency and control</strong>
                    <p className="mt-1">You always know what the AI is doing, and you can override or adjust anything at any time.</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Long-Term Mission */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                Our Long-Term Mission
              </h2>
            </div>
            <div className="max-w-3xl space-y-6 text-lg text-muted-foreground">
              <p>
                We&apos;re building for the long term. Our mission is to make AI automation accessible, trustworthy, and genuinely useful for organizations that serve communities.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground mb-2">Accessibility</h3>
                  <p>AI automation shouldn&apos;t require technical expertise or expensive infrastructure. It should work for everyone.</p>
                </div>
                <div className="p-6 rounded-lg border border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground mb-2">Trust</h3>
                  <p>We build trust through transparency, reliability, and respect for user data and privacy.</p>
                </div>
                <div className="p-6 rounded-lg border border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground mb-2">Impact</h3>
                  <p>We measure success by the time saved, errors reduced, and lives improved—not just features shipped.</p>
                </div>
                <div className="p-6 rounded-lg border border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground mb-2">Sustainability</h3>
                  <p>We&apos;re building a sustainable business that can serve communities for decades, not just a quick exit.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Our Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we build.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Users}
              title="User First"
              description="Every decision starts with: &apos;Does this make the user&apos;s life easier?&apos; If not, we don&apos;t build it."
              delay={0.1}
            />
            <FeatureCard
              icon={CheckCircle}
              title="Simplicity Over Features"
              description="We&apos;d rather have one feature that works perfectly than ten that confuse users."
              delay={0.2}
            />
            <FeatureCard
              icon={Heart}
              title="Ethical AI"
              description="We build AI that respects privacy, avoids bias, and serves the common good."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Tone Statement */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <blockquote className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-relaxed mb-6 text-foreground">
              &quot;Calm, confident, ethical.&quot;
            </blockquote>
            <p className="text-lg text-muted-foreground">
              This is how we approach our work. We&apos;re not here to hype AI or create fear. We&apos;re here to build tools that genuinely help people do their work better, with less stress and more impact.
            </p>
          </motion.div>
        </div>
      </section>

      <CTABlock
        title="Join Us on This Journey"
        description="Whether you&apos;re a small business, clinic, NGO, or institution, we&apos;d love to help you automate toward simplicity."
        primaryAction={{
          label: "Explore Use Cases",
          href: "/use-cases",
        }}
        secondaryAction={{
          label: "Learn About Automation",
          href: "/automation",
        }}
      />
    </>
  );
}


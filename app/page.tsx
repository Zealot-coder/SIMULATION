"use client";

import { Hero } from "@/components/hero";
import { FeatureCard } from "@/components/feature-card";
import { CTABlock } from "@/components/cta-block";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  Users,
  Zap,
  MessageSquare,
  Shield,
  Globe,
  TrendingUp,
} from "lucide-react";

export default function Home() {
  return (
    <>
      <Hero />

      {/* Problem Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              The Real Pain Points
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Small businesses, clinics, and NGOs face daily challenges that drain time and resources.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Solution Section */}
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
              Simple Automation, Real Results
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No complex dashboards. No training required. Just tell us what you need, and AI handles the rest.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-primary-foreground font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">You Speak or Type</h3>
                  <p className="text-muted-foreground">
                    Use WhatsApp, voice, or simple forms. No technical knowledge needed. Just communicate naturally.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-primary-foreground font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI Understands & Acts</h3>
                  <p className="text-muted-foreground">
                    Our AI processes your request, extracts the important information, and takes the right action automatically.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-primary-foreground font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Simple Output</h3>
                  <p className="text-muted-foreground">
                    You get a confirmation, a reminder sent, a record updated, or a task completed. No complexity, just results.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Time Saved</h3>
                  <p className="text-muted-foreground">
                    Hours of manual work become minutes. Your team focuses on what matters: serving people, not paperwork.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps from input to output. The AI disappears, only the result remains.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Input</h3>
              <p className="text-muted-foreground">
                Voice, WhatsApp, or simple forms. Natural communication, no learning curve.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Processing</h3>
              <p className="text-muted-foreground">
                Intelligent understanding, extraction, and action. Invisible automation working for you.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Output</h3>
              <p className="text-muted-foreground">
                Simple actions completed. Reminders sent. Records updated. Tasks done.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Africa → Why the World */}
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
              Why Africa → Why the World
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Constraint-driven innovation creates solutions that work everywhere.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeatureCard
              icon={Globe}
              title="Built for Constraints"
              description="Designed for low bandwidth, mobile-first users, and non-technical teams. If it works in Tanzania, it works anywhere."
              delay={0.1}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Trust & Simplicity First"
              description="No dark patterns. No complexity. Just clear value. This approach scales globally because it respects users everywhere."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CTABlock
        title="Ready to Simplify Your Workflow?"
        description="Join small businesses, clinics, and NGOs who are already saving hours every day with invisible automation."
        primaryAction={{
          label: "Get Started",
          href: "/use-cases",
        }}
        secondaryAction={{
          label: "Learn More",
          href: "/automation",
        }}
      />
    </>
  );
}



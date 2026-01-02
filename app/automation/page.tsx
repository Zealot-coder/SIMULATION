"use client";

import { motion } from "framer-motion";
import { FeatureCard } from "@/components/feature-card";
import { CTABlock } from "@/components/cta-block";
import { Settings, Brain, Sparkles, Clock, Shield, Zap } from "lucide-react";

export default function AutomationPage() {
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
              What Automation Really Means
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Automation isn&apos;t about replacing humans. It&apos;s about removing the friction that prevents us from doing what we do best: connecting with people and solving real problems.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Types of Automation */}
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
              Three Levels of Automation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understanding the difference helps you choose the right solution for your needs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-background"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Rule-Based Automation</h3>
              <p className="text-muted-foreground mb-4">
                Simple &quot;if this, then that&quot; logic. Works great for predictable, repetitive tasks.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Fixed workflows</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>No learning required</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Limited flexibility</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-8 rounded-lg border border-primary/20 bg-primary/5"
            >
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-6">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">AI-Assisted Automation</h3>
              <p className="text-muted-foreground mb-4">
                AI understands context and intent. Handles variations and learns from patterns.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Natural language understanding</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Adapts to variations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Gets smarter over time</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="p-8 rounded-lg border border-border bg-background"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Agentic Automation</h3>
              <p className="text-muted-foreground mb-4">
                AI agents that can reason, plan, and take multiple steps to complete complex tasks.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Multi-step reasoning</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Handles complex workflows</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Future of automation</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Focus on Removing Pain */}
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
              Our Focus: Removing Human Pain
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every automation we build starts with one question: &quot;What pain does this remove?&quot;
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Clock}
              title="Time Back"
              description="Hours spent on paperwork become minutes. Your team focuses on people, not processes."
              delay={0.1}
            />
            <FeatureCard
              icon={Shield}
              title="Fewer Errors"
              description="Automated systems don't forget, don't get tired, and don't make transcription mistakes."
              delay={0.2}
            />
            <FeatureCard
              icon={Zap}
              title="Instant Actions"
              description="Reminders sent immediately. Records updated in real-time. No waiting, no delays."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Philosophy Statement */}
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
              &quot;AI should disappear — only the result should remain.&quot;
            </blockquote>
            <p className="text-lg text-muted-foreground">
              This is our core philosophy. You shouldn&apos;t have to think about AI. You should just see your work getting done faster, more accurately, and with less stress.
            </p>
          </motion.div>
        </div>
      </section>

      <CTABlock
        title="See Automation in Action"
        description="Explore real use cases from clinics, small businesses, and NGOs using our platform."
        primaryAction={{
          label: "View Use Cases",
          href: "/use-cases",
        }}
        secondaryAction={{
          label: "Learn About Technology",
          href: "/technology",
        }}
      />
    </>
  );
}


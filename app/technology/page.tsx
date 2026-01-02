"use client";

import { motion } from "framer-motion";
import { FeatureCard } from "@/components/feature-card";
import { CTABlock } from "@/components/cta-block";
import {
  Brain,
  Shield,
  Zap,
  Globe,
  Lock,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function TechnologyPage() {
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
              Technology Built for Trust
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Modern AI, simple interface. We handle the complexity so you don&apos;t have to.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Modern AI Stack */}
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
              Modern AI Stack
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We use cutting-edge AI technology, but you&apos;ll never need to think about it.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-muted/30"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Natural Language Understanding</h3>
              <p className="text-muted-foreground mb-4">
                Our AI understands context, intent, and nuance. It doesn&apos;t just process words—it understands what you mean.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Works with Swahili, English, and mixed languages</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Handles voice, text, and informal communication</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Learns from your specific use case and improves over time</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-muted/30"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Agentic Automation</h3>
              <p className="text-muted-foreground mb-4">
                Our AI agents can reason through multi-step processes, make decisions, and take actions autonomously.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Handles complex workflows with multiple steps</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Adapts to unexpected situations and edge cases</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Can integrate with your existing tools and systems</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Privacy & Trust */}
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
              Privacy & Trust
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your data is yours. We&apos;re committed to privacy, security, and transparency.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Lock}
              title="Data Encryption"
              description="All data is encrypted in transit and at rest. Your information is protected with industry-standard security."
              delay={0.1}
            />
            <FeatureCard
              icon={Shield}
              title="Local Control"
              description="You control your data. We don&apos;t sell it, share it, or use it for training without your explicit permission."
              delay={0.2}
            />
            <FeatureCard
              icon={Globe}
              title="Compliance Ready"
              description="Built with privacy regulations in mind. We&apos;re committed to meeting local and international standards."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Why Simplicity is Hard */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Why Simplicity is Hard — and Valuable
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6 text-lg text-muted-foreground"
          >
            <p>
              Building simple, intuitive automation is actually harder than building complex systems. It requires:
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <Zap className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-foreground">Deep understanding of user needs</strong>
                  <p className="mt-1">We spend time understanding your actual workflow, not just implementing features.</p>
                </div>
              </li>
              <li className="flex items-start">
                <Zap className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-foreground">Rigorous testing and refinement</strong>
                  <p className="mt-1">Every feature is tested with real users in real scenarios before it&apos;s released.</p>
                </div>
              </li>
              <li className="flex items-start">
                <Zap className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-foreground">Continuous improvement</strong>
                  <p className="mt-1">We monitor how the system is used and constantly refine it to be simpler and more effective.</p>
                </div>
              </li>
            </ul>
            <p className="pt-4">
              This investment in simplicity pays off: users actually use the system, they trust it, and they see real value. That&apos;s why we prioritize simplicity over features.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Performance */}
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
              Built for Real-World Conditions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Optimized for the environments where you actually work.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-background"
            >
              <h3 className="text-2xl font-semibold mb-4">Low Bandwidth Optimized</h3>
              <p className="text-muted-foreground">
                Works efficiently even on slower connections. We minimize data transfer and optimize for mobile networks common in Tanzania and across Africa.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-background"
            >
              <h3 className="text-2xl font-semibold mb-4">Mobile-First Design</h3>
              <p className="text-muted-foreground">
                Built for phones first. Every feature works seamlessly on mobile devices because that&apos;s where most of our users work.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <CTABlock
        title="Ready to Experience Simple Automation?"
        description="See how our technology can transform your workflow without adding complexity."
        primaryAction={{
          label: "Explore Use Cases",
          href: "/use-cases",
        }}
        secondaryAction={{
          label: "Learn About Our Philosophy",
          href: "/automation",
        }}
      />
    </>
  );
}


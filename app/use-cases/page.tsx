"use client";

import { motion } from "framer-motion";
import { FeatureCard } from "@/components/feature-card";
import { CTABlock } from "@/components/cta-block";
import {
  Store,
  Heart,
  Users,
  Clock,
  CheckCircle,
  MessageSquare,
  Calendar,
  FileText,
} from "lucide-react";

export default function UseCasesPage() {
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
              Real Use Cases, Real Results
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              See how small businesses, clinics, and NGOs are saving time and reducing errors with invisible automation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Small Business Automation */}
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
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                Small Business Automation
              </h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Local shops, restaurants, and service businesses in Tanzania face the same challenges: managing inventory, customer communication, and daily operations with limited resources.
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
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <span className="text-primary mr-2">The Problem</span>
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Manual inventory tracking leads to stockouts and overstocking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Customer inquiries via WhatsApp go unanswered during busy hours</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Order management requires constant attention and manual entry</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>No time to follow up with customers or send reminders</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-primary/20 bg-primary/5"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <CheckCircle className="h-6 w-6 text-primary mr-2" />
                <span>The Automated Solution</span>
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>AI tracks inventory from WhatsApp messages and voice notes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Automated responses handle common customer questions 24/7</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Orders are automatically logged and organized</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Follow-up messages sent automatically based on purchase history</span>
                </li>
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-6 rounded-lg bg-primary/5 border border-primary/20"
          >
            <h4 className="font-semibold mb-2 flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              Human Benefit
            </h4>
            <p className="text-muted-foreground">
              <strong>3-5 hours saved daily</strong> on manual tasks. Business owners can focus on growth, customer relationships, and strategic decisions instead of data entry and message management.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Healthcare / Clinics */}
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
                Healthcare & Clinics
              </h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Clinics and health centers need to manage patient records, appointments, and follow-ups efficiently while maintaining accuracy and privacy.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-background"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <span className="text-primary mr-2">The Problem</span>
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Paper-based patient records are easily lost or damaged</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Appointment reminders require manual phone calls</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Follow-up care instructions are often forgotten or unclear</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Medication schedules and refill reminders are missed</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-primary/20 bg-primary/5"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <CheckCircle className="h-6 w-6 text-primary mr-2" />
                <span>The Automated Solution</span>
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Voice-to-text patient records captured during consultations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Automated WhatsApp reminders sent 24 hours before appointments</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Personalized follow-up messages with care instructions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Medication reminders and refill alerts sent automatically</span>
                </li>
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-6 rounded-lg bg-primary/5 border border-primary/20"
          >
            <h4 className="font-semibold mb-2 flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              Human Benefit
            </h4>
            <p className="text-muted-foreground">
              <strong>50% reduction in no-shows</strong> through automated reminders. <strong>2-3 hours saved daily</strong> on record-keeping. Healthcare providers can focus on patient care instead of administrative tasks. Better patient outcomes through consistent follow-up.
            </p>
          </motion.div>
        </div>
      </section>

      {/* NGOs & Institutions */}
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
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                NGOs & Institutions
              </h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Non-profits and educational institutions manage programs, beneficiaries, and communications with limited staff and resources.
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
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <span className="text-primary mr-2">The Problem</span>
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Program participant tracking requires manual spreadsheets</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Event announcements and updates sent individually</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Grant reporting requires compiling data from multiple sources</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">•</span>
                  <span>Volunteer coordination and scheduling is time-consuming</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-primary/20 bg-primary/5"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <CheckCircle className="h-6 w-6 text-primary mr-2" />
                <span>The Automated Solution</span>
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Automated participant registration and tracking via WhatsApp</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Bulk messaging for events, updates, and announcements</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Automated data collection and report generation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-1">✓</span>
                  <span>Smart scheduling and volunteer coordination</span>
                </li>
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-6 rounded-lg bg-primary/5 border border-primary/20"
          >
            <h4 className="font-semibold mb-2 flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              Human Benefit
            </h4>
            <p className="text-muted-foreground">
              <strong>60% reduction in administrative time</strong>. Staff can focus on program delivery and impact. Better engagement with beneficiaries through timely, personalized communication. More accurate reporting leads to better funding opportunities.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Features Across Use Cases */}
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
              Common Features Across All Use Cases
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={MessageSquare}
              title="WhatsApp Integration"
              description="Your users already use WhatsApp. So do we. No new apps to learn."
              delay={0.1}
            />
            <FeatureCard
              icon={Calendar}
              title="Smart Reminders"
              description="Automated, personalized reminders that actually get read and acted upon."
              delay={0.2}
            />
            <FeatureCard
              icon={FileText}
              title="Voice-to-Text"
              description="Speak naturally. AI captures and organizes everything automatically."
              delay={0.3}
            />
            <FeatureCard
              icon={CheckCircle}
              title="Error Reduction"
              description="Automated systems don't forget, don't get tired, and don't make mistakes."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      <CTABlock
        title="Ready to Transform Your Workflow?"
        description="See how automation can save your team hours every day while reducing errors and improving outcomes."
        primaryAction={{
          label: "Get Started",
          href: "/automation",
        }}
        secondaryAction={{
          label: "Learn About Our Technology",
          href: "/technology",
        }}
      />
    </>
  );
}



import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Automation Philosophy | AI Automation Platform",
  description: "Learn what automation really means. Understand the difference between rule-based, AI-assisted, and agentic automation. Focus on removing human pain.",
};

export default function AutomationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}



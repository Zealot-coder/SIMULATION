import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Technology | AI Automation Platform",
  description: "Modern AI stack built for trust. Learn about our natural language understanding, agentic automation, privacy, and why simplicity is hard—and valuable.",
};

export default function TechnologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}



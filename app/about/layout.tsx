import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About & Vision | AI Automation Platform",
  description: "Africa-first innovation that scales globally. Human-centered AI. Our mission to make automation accessible, trustworthy, and genuinely useful.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}



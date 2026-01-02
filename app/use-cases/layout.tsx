import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases | AI Automation Platform",
  description: "See how small businesses, clinics, and NGOs in Tanzania are saving time and reducing errors with invisible automation. Real use cases, real results.",
};

export default function UseCasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}



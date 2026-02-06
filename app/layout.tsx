import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuthProvider } from "@/contexts/auth-context";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/contexts/theme-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SIMULATION | Automation Toward Simplicity",
    template: "%s | SIMULATION",
  },
  description: "AI that removes friction, not adds complexity. Africa-first innovation for small businesses, clinics, and NGOs.",
  keywords: ["AI automation", "Tanzania", "Africa", "business automation", "healthcare automation", "WhatsApp automation", "voice automation"],
  authors: [{ name: "SIMULATION" }],
  creator: "SIMULATION",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://automation.ai",
    siteName: "SIMULATION",
    title: "SIMULATION | Automation Toward Simplicity",
    description: "AI that removes friction, not adds complexity. Africa-first innovation for small businesses, clinics, and NGOs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SIMULATION | Automation Toward Simplicity",
    description: "AI that removes friction, not adds complexity. Africa-first innovation for small businesses, clinics, and NGOs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <NextAuthSessionProvider>
            <AuthProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
              >
                Skip to main content
              </a>
              <Navbar />
              <main id="main-content" className="min-h-screen pt-16">
                {children}
              </main>
              <Footer />
            </AuthProvider>
          </NextAuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

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

// Blocking theme script to prevent flash
const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('simulation-theme');
      const root = document.documentElement;
      
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'custom') {
        const accent = localStorage.getItem('simulation-accent');
        if (accent) {
          let r = 0, g = 0, b = 0;
          if (accent.length === 4) {
            r = parseInt("0x" + accent[1] + accent[1], 16);
            g = parseInt("0x" + accent[2] + accent[2], 16);
            b = parseInt("0x" + accent[3] + accent[3], 16);
          } else if (accent.length === 7) {
            r = parseInt("0x" + accent[1] + accent[2], 16);
            g = parseInt("0x" + accent[3] + accent[4], 16);
            b = parseInt("0x" + accent[5] + accent[6], 16);
          }
          r /= 255; g /= 255; b /= 255;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h = 0, s = 0, l = (max + min) / 2;
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
              case g: h = ((b - r) / d + 2) / 6; break;
              case b: h = ((r - g) / d + 4) / 6; break;
            }
          }
          h = Math.round(h * 360);
          s = Math.round(s * 100);
          l = Math.round(l * 100);
          root.style.setProperty("--primary", h + " " + s + "% " + l + "%");
          root.style.setProperty("--accent", h + " " + s + "% " + l + "%");
          root.style.setProperty("--ring", h + " " + s + "% " + l + "%");
        }
      } else if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add('dark');
      }
    } catch (e) {
      console.error('Theme initialization error:', e);
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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

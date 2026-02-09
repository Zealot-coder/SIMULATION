"use client";

import { useEffect } from "react";

// This script runs before React hydration to prevent theme flash
export function ThemeScript() {
  useEffect(() => {
    // This is a client component that runs after hydration
    // The actual blocking script is in layout.tsx
  }, []);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              const theme = localStorage.getItem('simulation-theme');
              const root = document.documentElement;
              
              if (theme === 'dark') {
                root.classList.add('dark');
              } else if (theme === 'custom') {
                // Custom theme handling - will be applied by ThemeProvider
                const accent = localStorage.getItem('simulation-accent');
                if (accent) {
                  // Simple hex to HSL conversion for initial load
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
        `,
      }}
    />
  );
}

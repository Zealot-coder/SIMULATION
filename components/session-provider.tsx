"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function NextAuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// Simple user button showing user name and sign-out (client-side only)
export function UserButton() {
  // Lazy client-only import to avoid server-side issues
  'use client';
  const { data: session } = require('next-auth/react').useSession();
  const { signOut } = require('next-auth/react');
  const name = (session && (session as any).user && ((session as any).user.name || (session as any).user.email)) || 'Account';
  return (
    <div className="flex items-center gap-2">
      <div className="text-sm">{name}</div>
      <button className="text-sm text-muted-foreground" onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>
    </div>
  );
}

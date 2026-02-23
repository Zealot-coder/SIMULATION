"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

export type NormalizedOrgRole = "ADMIN" | "OPERATOR" | "VIEWER";

export interface OrganizationMembership {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: string;
  normalized_role: NormalizedOrgRole;
}

interface AuthContextUser {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  role: string;
  lastLogin?: string;
}

interface OrgAuthContextPayload {
  user: AuthContextUser;
  memberships: OrganizationMembership[];
  active_organization_id: string | null;
  onboarding_required: boolean;
  rbac_capabilities: {
    active_organization: {
      role: NormalizedOrgRole;
      can_view: true;
      can_operate: boolean;
      can_admin: boolean;
    } | null;
    memberships: Record<
      string,
      {
        role: NormalizedOrgRole;
        can_view: true;
        can_operate: boolean;
        can_admin: boolean;
      }
    >;
  };
}

interface OrgContextValue {
  loading: boolean;
  initialized: boolean;
  error: string | null;
  context: OrgAuthContextPayload | null;
  memberships: OrganizationMembership[];
  activeOrganization: OrganizationMembership | null;
  onboardingRequired: boolean;
  refreshContext: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<OrgAuthContextPayload | null>(null);

  const accessToken = (session as any)?.accessToken as string | undefined;

  const loadContext = useCallback(async () => {
    if (!accessToken) {
      setContext(null);
      setInitialized(true);
      return;
    }

    setLoading(true);
    setError(null);
    apiClient.setToken(accessToken);

    try {
      const payload = (await apiClient.getAuthContext()) as OrgAuthContextPayload;
      setContext(payload);
      setInitialized(true);
    } catch (err: any) {
      setError(err?.message || "Failed to load organization context");
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === "unauthenticated") {
      setContext(null);
      setInitialized(true);
      setLoading(false);
      return;
    }

    if (status === "authenticated") {
      void loadContext();
    }
  }, [loadContext, status]);

  useEffect(() => {
    if (!initialized || loading || status !== "authenticated" || !pathname?.startsWith("/app")) {
      return;
    }

    if (context?.onboarding_required && pathname !== "/app/onboarding") {
      router.replace("/app/onboarding");
      return;
    }

    if (!context?.onboarding_required && pathname === "/app/onboarding") {
      router.replace("/app/overview");
    }
  }, [context?.onboarding_required, initialized, loading, pathname, router, status]);

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (!accessToken) {
        throw new Error("Missing access token");
      }

      apiClient.setToken(accessToken);
      const payload = (await apiClient.setActiveOrganization(
        organizationId,
      )) as OrgAuthContextPayload;
      setContext(payload);
      await update?.({
        user: {
          ...(session?.user || {}),
          activeOrganizationId: payload.active_organization_id,
          organizationId: payload.active_organization_id,
        },
      } as any);
    },
    [accessToken, session?.user, update],
  );

  const value = useMemo<OrgContextValue>(() => {
    const memberships = context?.memberships || [];
    const activeOrganization = memberships.find(
      (membership) => membership.organization_id === context?.active_organization_id,
    );

    return {
      loading,
      initialized,
      error,
      context,
      memberships,
      activeOrganization: activeOrganization || null,
      onboardingRequired: context?.onboarding_required ?? true,
      refreshContext: loadContext,
      switchOrganization,
    };
  }, [context, error, initialized, loadContext, loading, switchOrganization]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrgContext must be used within OrgContextProvider");
  }
  return ctx;
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type Role = "SUPER_ADMIN" | "ORG_ADMIN" | "OPERATOR" | "VIEWER";

export function isSuperAdmin(role?: string | null) {
  return role === "SUPER_ADMIN";
}

export function isOrgAdmin(role?: string | null) {
  return role === "ORG_ADMIN" || role === "SUPER_ADMIN";
}

export function isOperator(role?: string | null) {
  return role === "OPERATOR" || role === "ORG_ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Server-side helper that returns the current session user and asserts authentication.
 * Note: session.user should include `id` and `role` properties as provided by backend auth.
 */
export async function requireAuth() {
  const session: any = await getServerSession(authOptions as any);
  if (!session || !session.user) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return session as any;
}

/**
 * Ensure that user is allowed to act on organization.
 * For now this performs a simple role-based check or compares session.claim.organization_id
 * TODO: Replace with an authoritative check against Supabase `organization_members` during RLS-enabled authorization
 */
export async function requireOrgAccess(orgId: string) {
  const session = await requireAuth();
  const role = (session.user as any).role as string | undefined;
  // If super admin always allowed
  if (isSuperAdmin(role)) return session;

  // If the session includes `org_id` or `org_ids` claim, check membership
  const claimOrgId = (session.user as any).org_id || (session.user as any).organization_id;
  const orgIds = (session.user as any).org_ids || (session.user as any).organization_ids;

  if (claimOrgId && claimOrgId === orgId) return session;
  if (Array.isArray(orgIds) && orgIds.includes(orgId)) return session;

  const err: any = new Error("Forbidden: user is not a member of organization");
  err.status = 403;
  throw err;
}

export async function requireRoleAtLeast(minRole: Role) {
  const session = await requireAuth();
  const role = (session.user as any).role as Role | undefined;
  if (!role) {
    const err: any = new Error("Forbidden: missing role");
    err.status = 403;
    throw err;
  }

  const order: Role[] = ["VIEWER", "OPERATOR", "ORG_ADMIN", "SUPER_ADMIN"];
  if (order.indexOf(role) < order.indexOf(minRole)) {
    const err: any = new Error("Forbidden: insufficient role");
    err.status = 403;
    throw err;
  }
  return session;
}
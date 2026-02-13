export type SupportedRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "OPERATOR"
  | "VIEWER"
  | "OWNER"
  | "ADMIN"
  | "STAFF";

export function isDevRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "OWNER";
}

export function getDashboardRouteForRole(role?: string | null): "/dev/overview" | "/app/overview" {
  return isDevRole(role) ? "/dev/overview" : "/app/overview";
}

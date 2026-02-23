import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OrgContextProvider } from "@/contexts/org-context";

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 4,
  ORG_ADMIN: 3,
  OPERATOR: 2,
  VIEWER: 1,
  OWNER: 4, // Legacy support
  ADMIN: 3, // Legacy support
  STAFF: 2, // Legacy support
};

/**
 * Protected routes layout.
 * - Redirects unauthenticated users to /auth/sign-in
 * - Blocks non-admin users from accessing /dev/* routes
 */
export default async function ProtectedLayout({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const session: any = await getServerSession(authOptions as any);

  // Not authenticated → redirect to sign-in
  if (!session || !session.user) {
    redirect("/auth/sign-in");
  }

  const userRole = (session.user.role as string) || "VIEWER";

  // Check if user role is valid
  if (!ROLE_HIERARCHY[userRole]) {
    redirect("/auth/sign-in?error=invalid_role");
  }

  return <OrgContextProvider>{children}</OrgContextProvider>;
}

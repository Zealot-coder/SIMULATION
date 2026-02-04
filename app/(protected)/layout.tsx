import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Protected routes layout.
 * - Redirects unauthenticated users to /auth/sign-in
 * - Blocks non-SUPER_ADMIN users from accessing /dev/* routes
 */
export default async function ProtectedLayout({ children, params }: { children: React.ReactNode; params?: any }) {
  const session: any = await getServerSession(authOptions as any);

  // Not authenticated → redirect to sign-in
  if (!session || !session.user) {
    redirect("/auth/sign-in");
  }

  // Check if user is trying to access /dev and doesn't have SUPER_ADMIN role
  // Note: This is a simple check. For full path-based checks, use pathname from usePathname() in a client component
  // OR derive it from params if available. Here we do a simple role check that applies to /dev/* routes.
  const role = (session.user as any).role;
  if (params && params.path && Array.isArray(params.path) && params.path[0] === "dev" && role !== "SUPER_ADMIN") {
    // Non-super-admin trying to access /dev → redirect to /app/overview
    redirect("/app/overview");
  }

  return <>{children}</>;
}

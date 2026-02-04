import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Admin routes layout.
 * - Redirects unauthenticated users to /auth/sign-in
 * - Blocks non-OWNER users from accessing admin routes
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: any = await getServerSession(authOptions as any);

  // Not authenticated → redirect to sign-in
  if (!session || !session.user) {
    redirect("/auth/sign-in");
  }

  // Check if user is OWNER
  const role = (session.user as any).role;
  if (role !== "OWNER" && role !== "SUPER_ADMIN") {
    // Non-owner trying to access admin → redirect to dashboard
    redirect("/dashboard");
  }

  return <>{children}</>;
}

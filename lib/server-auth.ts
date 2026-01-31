import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login`);
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login`);
  }
  const role = (session.user as any)?.role as string | undefined;
  if (!role || !allowedRoles.includes(role)) {
    redirect("/dashboard");
  }
  return session;
}

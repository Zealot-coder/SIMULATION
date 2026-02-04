import { redirect } from "next/navigation";

/**
 * Redirect from /app to /app/overview (protected route)
 */
export default function AppIndexPage() {
  redirect("/app/overview");
}

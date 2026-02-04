import { redirect } from "next/navigation";

/**
 * Redirect from /dev to /dev/overview (protected, super-admin only route)
 */
export default function DevIndexPage() {
  redirect("/dev/overview");
}

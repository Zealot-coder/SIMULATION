export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/settings/:path*",
    "/projects/:path*",
    "/billing/:path*",
    "/admin/:path*",
    // Protected routes under (protected) group
    "/app/:path*",
    "/dev/:path*",
  ],
};

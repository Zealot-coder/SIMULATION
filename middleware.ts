export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/settings/:path*",
    "/projects/:path*",
    "/billing/:path*",
    "/admin/:path*",
  ],
};

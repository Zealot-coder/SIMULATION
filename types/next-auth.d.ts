import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: DefaultSession["user"] & {
      id?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    user?: {
      id?: string;
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    };
    accessTokenExpiredAt?: number;
  }
}

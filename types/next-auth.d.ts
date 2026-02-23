import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
    user: DefaultSession["user"] & {
      id?: string;
      email?: string;
      phone?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
      role?: string;
      organizationId?: string;
      activeOrganizationId?: string;
      onboardingRequired?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
    user?: {
      id?: string;
      email?: string;
      phone?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
      role?: string;
      organizationId?: string;
      activeOrganizationId?: string;
      onboardingRequired?: boolean;
    };
    accessTokenExpiredAt?: number;
  }
}

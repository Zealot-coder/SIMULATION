import { Request } from 'express';

interface AuthenticatedUser {
  id?: string;
  [key: string]: unknown;
}

interface OrganizationContext {
  id?: string;
  [key: string]: unknown;
}

export interface RequestWithContext extends Request {
  correlationId?: string;
  user?: AuthenticatedUser;
  organization?: OrganizationContext;
  membership?: Record<string, unknown>;
}

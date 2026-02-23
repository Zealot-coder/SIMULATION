import { UserRole } from '@prisma/client';

export type NormalizedOrgRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface RbacCapabilities {
  role: NormalizedOrgRole;
  can_view: true;
  can_operate: boolean;
  can_admin: boolean;
}

export function normalizeOrganizationRole(role: UserRole | string | null | undefined): NormalizedOrgRole {
  switch (String(role || '').toUpperCase()) {
    case 'OWNER':
    case 'SUPER_ADMIN':
    case 'ADMIN':
    case 'ORG_ADMIN':
      return 'ADMIN';
    case 'STAFF':
    case 'OPERATOR':
      return 'OPERATOR';
    default:
      return 'VIEWER';
  }
}

export function buildRbacCapabilities(role: UserRole | string | null | undefined): RbacCapabilities {
  const normalized = normalizeOrganizationRole(role);
  return {
    role: normalized,
    can_view: true,
    can_operate: normalized !== 'VIEWER',
    can_admin: normalized === 'ADMIN',
  };
}

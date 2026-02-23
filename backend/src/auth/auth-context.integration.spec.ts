import { AuthService } from './auth.service';

describe('AuthService auth-context integration', () => {
  it('handles onboarding decision and active-organization switching end-to-end', async () => {
    const userState: any = {
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      firstName: 'User',
      lastName: 'One',
      name: 'User One',
      avatar: null,
      role: 'VIEWER',
      isActive: true,
      lastLogin: new Date('2026-02-23T00:00:00.000Z'),
      activeOrganizationId: null,
    };
    const organizations = {
      'org-1': { id: 'org-1', name: 'Org One', slug: 'org-one' },
      'org-2': { id: 'org-2', name: 'Org Two', slug: 'org-two' },
    } as Record<string, { id: string; name: string; slug: string }>;
    const memberships: any[] = [
      {
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'VIEWER',
        isActive: true,
      },
      {
        userId: 'user-1',
        organizationId: 'org-2',
        role: 'ADMIN',
        isActive: true,
      },
    ];

    const prisma = {
      user: {
        findUnique: jest.fn(async ({ where, include, select }: any) => {
          if (where.id !== userState.id) {
            return null;
          }

          if (select) {
            return {
              id: userState.id,
              activeOrganizationId: userState.activeOrganizationId,
            };
          }

          if (include?.organizationMemberships) {
            return {
              ...userState,
              organizationMemberships: memberships.map((membership) => ({
                ...membership,
                organization: organizations[membership.organizationId],
              })),
              oauthAccounts: [],
            };
          }

          return { ...userState };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          if (where.id !== userState.id) {
            throw new Error('User not found');
          }
          userState.activeOrganizationId = data.activeOrganizationId;
          return { ...userState };
        }),
      },
      organizationMember: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const key = where.userId_organizationId;
          const membership = memberships.find(
            (entry) =>
              entry.userId === key.userId &&
              entry.organizationId === key.organizationId,
          );
          if (!membership) {
            return null;
          }

          if (include?.organization) {
            return {
              ...membership,
              organization: organizations[membership.organizationId],
            };
          }

          return membership;
        }),
      },
      refreshToken: {
        create: jest.fn(),
      },
    };

    const service = new AuthService(
      prisma as any,
      { sign: jest.fn(() => 'token') } as any,
      { get: jest.fn(() => '7d') } as any,
      { log: jest.fn() } as any,
    );

    const initialContext = await service.getAuthContext('user-1');
    expect(initialContext.onboarding_required).toBe(false);
    expect(initialContext.active_organization_id).toBe('org-1');

    const switchedContext = await service.setActiveOrganization('user-1', 'org-2');
    expect(switchedContext.active_organization_id).toBe('org-2');
    expect(switchedContext.rbac_capabilities.active_organization?.role).toBe('ADMIN');
    expect(userState.activeOrganizationId).toBe('org-2');
  });
});

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService organization context', () => {
  const jwtService = {
    sign: jest.fn(() => 'token'),
  };
  const configService = {
    get: jest.fn(() => '7d'),
  };

  let prisma: any;
  let auditService: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findUnique: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
      },
    };
    auditService = {
      log: jest.fn(),
    };

    service = new AuthService(
      prisma as any,
      jwtService as any,
      configService as any,
      auditService as any,
    );
  });

  it('returns onboarding_required=true when user has no memberships', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      firstName: 'User',
      lastName: 'One',
      name: 'User One',
      avatar: null,
      role: 'VIEWER',
      lastLogin: new Date('2026-02-23T00:00:00.000Z'),
      activeOrganizationId: null,
      isActive: true,
      organizationMemberships: [],
      oauthAccounts: [],
    });

    const context = await service.getAuthContext('user-1');

    expect(context.onboarding_required).toBe(true);
    expect(context.memberships).toHaveLength(0);
    expect(context.active_organization_id).toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('assigns first active membership as active organization when missing', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      firstName: 'User',
      lastName: 'One',
      name: 'User One',
      avatar: null,
      role: 'VIEWER',
      lastLogin: new Date('2026-02-23T00:00:00.000Z'),
      activeOrganizationId: null,
      isActive: true,
      organizationMemberships: [
        {
          organizationId: 'org-1',
          role: 'STAFF',
          isActive: true,
          organization: {
            id: 'org-1',
            name: 'Org One',
            slug: 'org-one',
          },
        },
        {
          organizationId: 'org-2',
          role: 'ADMIN',
          isActive: true,
          organization: {
            id: 'org-2',
            name: 'Org Two',
            slug: 'org-two',
          },
        },
      ],
      oauthAccounts: [],
    });

    const context = await service.getAuthContext('user-1');

    expect(context.onboarding_required).toBe(false);
    expect(context.active_organization_id).toBe('org-1');
    expect(context.rbac_capabilities.active_organization?.role).toBe('OPERATOR');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activeOrganizationId: 'org-1' },
    });
  });

  it('rejects active organization switch when user is not a member', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      activeOrganizationId: 'org-1',
    });
    prisma.organizationMember.findUnique.mockResolvedValue(null);

    await expect(service.setActiveOrganization('user-1', 'org-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('switches active organization and writes audit log', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      activeOrganizationId: 'org-1',
    });
    prisma.organizationMember.findUnique.mockResolvedValue({
      organizationId: 'org-2',
      role: 'ADMIN',
      isActive: true,
      organization: {
        id: 'org-2',
        name: 'Org Two',
        slug: 'org-two',
      },
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1', activeOrganizationId: 'org-2' });

    const expectedContext = {
      user: { id: 'user-1' },
      memberships: [],
      active_organization_id: 'org-2',
      onboarding_required: false,
      rbac_capabilities: {
        active_organization: null,
        memberships: {},
      },
    };
    const contextSpy = jest.spyOn(service, 'getAuthContext').mockResolvedValue(expectedContext as any);

    const response = await service.setActiveOrganization('user-1', 'org-2');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activeOrganizationId: 'org-2' },
    });
    expect(auditService.log).toHaveBeenCalled();
    expect(contextSpy).toHaveBeenCalledWith('user-1');
    expect(response).toEqual(expectedContext);
  });

  it('throws unauthorized when context is requested for inactive/missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getAuthContext('missing-user')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

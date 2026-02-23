import { ForbiddenException } from '@nestjs/common';
import { OrganizationGuard } from './organization.guard';

describe('OrganizationGuard', () => {
  let prisma: any;
  let guard: OrganizationGuard;

  beforeEach(() => {
    prisma = {
      organizationMember: {
        findUnique: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
    };
    guard = new OrganizationGuard(prisma as any);
  });

  function createExecutionContext(request: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  it('uses activeOrganizationId when explicit organizationId is not provided', async () => {
    const request: any = {
      user: {
        id: 'user-1',
        activeOrganizationId: 'org-1',
      },
      body: {},
      query: {},
      params: {},
      headers: {},
    };

    prisma.organizationMember.findUnique.mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'ADMIN',
      isActive: true,
    });
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Org One',
    });

    const allowed = await guard.canActivate(createExecutionContext(request));

    expect(allowed).toBe(true);
    expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: 'user-1',
          organizationId: 'org-1',
        },
      },
    });
    expect(request.organization).toEqual({ id: 'org-1', name: 'Org One' });
  });

  it('rejects requests when organization context is missing', async () => {
    const request: any = {
      user: { id: 'user-1' },
      body: {},
      query: {},
      params: {},
      headers: {},
    };

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects requests for non-member users', async () => {
    const request: any = {
      user: {
        id: 'user-1',
        activeOrganizationId: 'org-2',
      },
      body: {},
      query: {},
      params: {},
      headers: {},
    };

    prisma.organizationMember.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

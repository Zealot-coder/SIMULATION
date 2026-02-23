import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = this.resolveOrganizationId(request);

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    // Attach organization and membership to request
    request.organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    request.membership = membership;

    return true;
  }

  private resolveOrganizationId(request: any): string | undefined {
    const candidates: unknown[] = [
      request?.params?.organizationId,
      request?.body?.organizationId,
      request?.query?.organizationId,
      request?.headers?.['x-organization-id'],
      request?.user?.activeOrganizationId,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const first = candidate.find((item) => typeof item === 'string' && item.length > 0);
        if (typeof first === 'string') {
          return first;
        }
        continue;
      }

      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }

    return undefined;
  }
}



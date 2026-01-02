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
    const organizationId = request.params.organizationId || request.body.organizationId;

    if (!organizationId) {
      return true; // No organization context required
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
}


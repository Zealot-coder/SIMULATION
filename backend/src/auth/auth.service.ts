import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { buildRbacCapabilities, normalizeOrganizationRole } from './rbac.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('User with this phone already exists');
      }
    }

    // Hash password if provided
    const hashedPassword = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : null;

    // Bootstrap rule: ensure there is always at least one platform owner.
    const ownerCount = await this.prisma.user.count({
      where: { role: 'OWNER' },
    });
    const assignedRole = ownerCount === 0 ? 'OWNER' : (dto.role || 'VIEWER');

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        name: [dto.firstName, dto.lastName].filter(Boolean).join(' ') || undefined,
        role: assignedRole,
        isActive: true,
        lastLogin: new Date(),
      },
    });

    const accessToken = this.generateToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        name: user.name ?? undefined,
        avatar: user.avatar ?? undefined,
        role: user.role,
        activeOrganizationId: user.activeOrganizationId ?? undefined,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password if provided
    if (dto.password) {
      if (!user.password) {
        throw new UnauthorizedException('Password not set for this account');
      }
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const accessToken = this.generateToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        name: user.name ?? undefined,
        avatar: user.avatar ?? undefined,
        role: user.role,
        activeOrganizationId: user.activeOrganizationId ?? undefined,
      },
    };
  }

  private generateToken(userId: string): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });
  }

  async generateTokenForUser(userId: string): Promise<string> {
    return this.generateToken(userId);
  }

  async generateTokensForOAuthUser(userData: any): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateToken(userData.id);
    const refreshToken = await this.generateRefreshToken(userData.id);
    return { accessToken, refreshToken };
  }

  async validateUser(userId: string) {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organizationMemberships: {
            include: {
              organization: true,
            },
          },
          oauthAccounts: true,
        },
      });
    } catch (err: any) {
      // Legacy production DBs may not have Organization/OrganizationMember tables yet.
      // Fall back to a minimal user lookup for auth.
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          oauthAccounts: true,
        },
      });
    }

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  async getAuthContext(userId: string) {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const memberships = (user.organizationMemberships || [])
      .filter((membership: any) => membership?.isActive && membership?.organization?.id)
      .map((membership: any) => ({
        organization_id: membership.organizationId,
        organization_name: membership.organization.name,
        organization_slug: membership.organization.slug,
        role: membership.role,
        normalized_role: normalizeOrganizationRole(membership.role),
      }));

    let activeOrganizationId: string | null = user.activeOrganizationId ?? null;
    if (
      activeOrganizationId &&
      !memberships.some((membership: any) => membership.organization_id === activeOrganizationId)
    ) {
      activeOrganizationId = null;
    }

    if (!activeOrganizationId && memberships.length > 0) {
      activeOrganizationId = memberships[0].organization_id;
    }

    if (activeOrganizationId !== (user.activeOrganizationId ?? null)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { activeOrganizationId },
      });
    }

    const activeMembership = memberships.find(
      (membership: any) => membership.organization_id === activeOrganizationId,
    );
    const membershipCapabilities: Record<string, ReturnType<typeof buildRbacCapabilities>> = {};
    for (const membership of memberships) {
      membershipCapabilities[membership.organization_id] = buildRbacCapabilities(membership.role);
    }

    return {
      user: {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        name: user.name ?? undefined,
        avatar: user.avatar ?? undefined,
        role: user.role,
        lastLogin: user.lastLogin,
      },
      memberships,
      active_organization_id: activeOrganizationId,
      onboarding_required: memberships.length === 0,
      rbac_capabilities: {
        active_organization: activeMembership
          ? buildRbacCapabilities(activeMembership.role)
          : null,
        memberships: membershipCapabilities,
      },
    };
  }

  async setActiveOrganization(userId: string, organizationId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, activeOrganizationId: true },
    });

    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: organizationId },
    });

    await this.auditService.log(
      AuditAction.UPDATE,
      'User',
      userId,
      'Active organization changed',
      {
        userId,
        organizationId,
        metadata: {
          fromOrganizationId: currentUser.activeOrganizationId,
          toOrganizationId: organizationId,
          organizationName: membership.organization?.name,
          organizationSlug: membership.organization?.slug,
        },
      },
    );

    return this.getAuthContext(userId);
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = this.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!tokenRecord.user || !tokenRecord.user.isActive) {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const accessToken = this.generateToken(tokenRecord.userId);
    const newRefreshToken = await this.generateRefreshToken(tokenRecord.userId);

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { 
      accessToken, 
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        name: user.name ?? undefined,
        avatar: user.avatar ?? undefined,
        role: user.role,
        activeOrganizationId: user.activeOrganizationId ?? undefined,
      }
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
  }

  private generateRandomToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

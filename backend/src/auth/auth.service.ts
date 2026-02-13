import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GitHubStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const explicitCallback = configService.get<string>('GITHUB_CALLBACK_URL');
    const backendUrl = configService.get<string>('BACKEND_URL');
    const callbackURL =
      explicitCallback ||
      (backendUrl
        ? `${backendUrl.replace(/\/$/, '')}/api/v1/auth/github/callback`
        : 'http://localhost:3001/api/v1/auth/github/callback');

    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const { id, username, emails, displayName, photos } = profile;
    
    // GitHub may not always provide email in profile
    const email = emails?.[0]?.value || `${username}@users.noreply.github.com`;
    const avatar = photos?.[0]?.value;
    const fullName = displayName || username;

    try {
      // Upsert user with transaction
      const user = await this.prisma.$transaction(async (tx) => {
        // Find existing user by email or GitHub username pattern
        let existingUser = await tx.user.findFirst({
          where: {
            OR: [
              { email },
              { email: `${username}@users.noreply.github.com` },
            ],
          },
          include: { oauthAccounts: true },
        });

        if (existingUser) {
          // User exists - update info
          this.logger.log(`Existing user signing in with GitHub: ${email}`);
          
          existingUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              firstName: fullName || existingUser.firstName,
              name: fullName || existingUser.name,
              avatar: avatar || existingUser.avatar,
              lastLogin: new Date(),
              isActive: true,
            },
            include: { oauthAccounts: true },
          });

          // Check if OAuth account exists
          const existingOAuth = existingUser.oauthAccounts.find(
            (oa: any) => oa.provider === 'github',
          );

          if (!existingOAuth) {
            // Link new OAuth provider
            await tx.oAuthAccount.create({
              data: {
                userId: existingUser.id,
                provider: 'github',
                providerAccountId: id,
                email,
                name: fullName,
                avatar,
              },
            });
            this.logger.log(`Linked GitHub OAuth to existing user: ${email}`);
          } else {
            // Update OAuth account info
            await tx.oAuthAccount.update({
              where: { id: existingOAuth.id },
              data: {
                providerAccountId: id,
                email,
                name: fullName,
                avatar,
                updatedAt: new Date(),
              },
            });
          }

          return existingUser;
        } else {
          // Create new user
          this.logger.log(`Creating new user from GitHub OAuth: ${email}`);
          const ownerCount = await tx.user.count({
            where: { role: 'OWNER' },
          });
          const assignedRole = ownerCount === 0 ? 'OWNER' : 'VIEWER';
          
          const newUser = await tx.user.create({
            data: {
              email,
              firstName: fullName,
              name: fullName,
              avatar,
              role: assignedRole,
              isActive: true,
              lastLogin: new Date(),
              oauthAccounts: {
                create: {
                  provider: 'github',
                  providerAccountId: id,
                  email,
                  name: fullName,
                  avatar,
                },
              },
            },
            include: { oauthAccounts: true },
          });

          this.logger.log(`Created new user: ${newUser.id} with GitHub OAuth`);
          return newUser;
        }
      });

      // Return user data for JWT generation
      const result = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        provider: 'github',
        providerAccountId: id,
      };

      done(null, result);
    } catch (error) {
      this.logger.error('GitHub OAuth validation error:', error);
      done(error, false);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const explicitCallback = configService.get<string>('GOOGLE_CALLBACK_URL');
    const backendUrl = configService.get<string>('BACKEND_URL');
    const callbackURL =
      explicitCallback ||
      (backendUrl
        ? `${backendUrl.replace(/\/$/, '')}/api/v1/auth/google/callback`
        : 'http://localhost:3001/api/v1/auth/google/callback');

    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  authorizationParams(): Record<string, string> {
    return {
      prompt: 'select_account',
    };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;
    const email = emails?.[0]?.value;
    const firstName = name?.givenName;
    const lastName = name?.familyName;
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const avatar = photos?.[0]?.value;

    if (!email) {
      return done(new Error('No email provided by Google'), false);
    }

    try {
      // Upsert user - create if doesn't exist, update if exists
      const user = await this.prisma.$transaction(async (tx) => {
        // Find existing user by email
        let existingUser = await tx.user.findUnique({
          where: { email },
          include: { oauthAccounts: true },
        });

        if (existingUser) {
          // User exists - update last login and OAuth info
          this.logger.log(`Existing user signing in: ${email}`);
          
          // Update user info from Google (in case it changed)
          existingUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              firstName: firstName || existingUser.firstName,
              lastName: lastName || existingUser.lastName,
              name: fullName || existingUser.name,
              avatar: avatar || existingUser.avatar,
              lastLogin: new Date(),
              isActive: true,
            },
            include: { oauthAccounts: true },
          });

          // Check if OAuth account exists, if not create it
          const existingOAuth = existingUser.oauthAccounts.find(
            (oa: any) => oa.provider === 'google',
          );

          if (!existingOAuth) {
            // Link new OAuth provider to existing account
            await tx.oAuthAccount.create({
              data: {
                userId: existingUser.id,
                provider: 'google',
                providerAccountId: id,
                email,
                name: fullName,
                avatar,
              },
            });
            this.logger.log(`Linked Google OAuth to existing user: ${email}`);
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
          this.logger.log(`Creating new user from Google OAuth: ${email}`);
          const ownerCount = await tx.user.count({
            where: { role: 'OWNER' },
          });
          const assignedRole = ownerCount === 0 ? 'OWNER' : 'VIEWER';
          
          const newUser = await tx.user.create({
            data: {
              email,
              firstName,
              lastName,
              name: fullName,
              avatar,
              role: assignedRole,
              isActive: true,
              lastLogin: new Date(),
              oauthAccounts: {
                create: {
                  provider: 'google',
                  providerAccountId: id,
                  email,
                  name: fullName,
                  avatar,
                },
              },
            },
            include: { oauthAccounts: true },
          });

          this.logger.log(`Created new user: ${newUser.id} with Google OAuth`);
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
        provider: 'google',
        providerAccountId: id,
      };

      done(null, result);
    } catch (error) {
      this.logger.error('Google OAuth validation error:', error);
      done(error, false);
    }
  }
}

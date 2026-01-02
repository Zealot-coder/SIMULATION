import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || '/api/v1/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const { id, username, emails, displayName } = profile;
    
    // GitHub may not always provide email in profile
    const email = emails?.[0]?.value || `${username}@users.noreply.github.com`;
    
    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { email: `${username}@users.noreply.github.com` },
        ],
      },
    });

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: displayName || username,
          role: 'VIEWER',
          // No password for OAuth users
        },
      });
    }

    return user;
  }
}


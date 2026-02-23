import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Res, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SetActiveOrganizationDto } from './dto/set-active-organization.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GitHubOAuthGuard } from './guards/github-oauth.guard';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private normalizeAbsoluteBaseUrl(value: string | undefined) {
    const trimmed = String(value || '').trim().replace(/\/$/, '');
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(trimmed)) {
      return `http://${trimmed}`;
    }
    return `https://${trimmed}`;
  }

  private getFrontendBaseUrl() {
    const candidate =
      process.env.FRONTEND_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const normalized = this.normalizeAbsoluteBaseUrl(candidate);
    try {
      // Validate; ensures we don't throw later during OAuth redirects.
      // eslint-disable-next-line no-new
      new URL(normalized);
      return normalized;
    } catch {
      this.logger.warn(`Invalid FRONTEND_URL/NEXTAUTH_URL: ${candidate}`);
      return 'http://localhost:3000';
    }
  }

  private buildFrontendAuthCallbackUrl() {
    const base = this.getFrontendBaseUrl().replace(/\/$/, '');
    return new URL(`${base}/auth/callback`);
  }

  private redirectOAuthError(res: Response, provider: 'google' | 'github', reason?: string) {
    const redirectUrl = this.buildFrontendAuthCallbackUrl();
    redirectUrl.searchParams.set('error', 'oauth_failed');
    redirectUrl.searchParams.set('provider', provider);

    // Only include details outside production to avoid leaking internals to end users.
    if (process.env.NODE_ENV !== 'production' && reason) {
      redirectUrl.searchParams.set('reason', String(reason).slice(0, 200));
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(redirectUrl.toString());
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;

    if (!user) {
      return this.redirectOAuthError(res, 'google', (req as any).oauthError);
    }

    try {
      const tokens = await this.authService.generateTokensForOAuthUser(user);
      const redirectUrl = this.buildFrontendAuthCallbackUrl();

      redirectUrl.searchParams.set('token', tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
      redirectUrl.searchParams.set('provider', 'google');
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('role', user.role);

      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(redirectUrl.toString());
    } catch (err: any) {
      this.logger.error(
        `Google OAuth callback failed: ${err?.message || err}`,
        err?.stack,
      );
      return this.redirectOAuthError(res, 'google');
    }
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Initiates GitHub OAuth flow
  }

  @Get('github/callback')
  @UseGuards(GitHubOAuthGuard)
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;

    if (!user) {
      return this.redirectOAuthError(res, 'github', (req as any).oauthError);
    }

    try {
      const tokens = await this.authService.generateTokensForOAuthUser(user);
      const redirectUrl = this.buildFrontendAuthCallbackUrl();

      redirectUrl.searchParams.set('token', tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
      redirectUrl.searchParams.set('provider', 'github');
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('role', user.role);

      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(redirectUrl.toString());
    } catch (err: any) {
      this.logger.error(
        `GitHub OAuth callback failed: ${err?.message || err}`,
        err?.stack,
      );
      return this.redirectOAuthError(res, 'github');
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    const context = await this.authService.getAuthContext(user.id);

    return {
      ...context.user,
      activeOrganizationId: context.active_organization_id,
      onboardingRequired: context.onboarding_required,
      organizations: context.memberships.map((membership: any) => ({
        id: membership.organization_id,
        name: membership.organization_name,
        slug: membership.organization_slug,
        role: membership.role,
        normalizedRole: membership.normalized_role,
      })),
    };
  }

  @Get('context')
  @UseGuards(JwtAuthGuard)
  async getContext(@CurrentUser() user: any) {
    return this.authService.getAuthContext(user.id);
  }

  @Post('active-organization')
  @UseGuards(JwtAuthGuard)
  async setActiveOrganization(
    @CurrentUser() user: any,
    @Body() dto: SetActiveOrganizationDto,
  ) {
    return this.authService.setActiveOrganization(user.id, dto.organizationId);
  }
}

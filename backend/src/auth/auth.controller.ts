import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    
    // Generate tokens for the user
    const tokens = await this.authService.generateTokensForOAuthUser(user);
    
    // Redirect to frontend with tokens and user info
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    
    // Add tokens and user info to query params
    redirectUrl.searchParams.set('token', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
    redirectUrl.searchParams.set('provider', 'google');
    redirectUrl.searchParams.set('userId', user.id);
    redirectUrl.searchParams.set('role', user.role);
    
    res.redirect(redirectUrl.toString());
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Initiates GitHub OAuth flow
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    
    // Generate tokens for the user
    const tokens = await this.authService.generateTokensForOAuthUser(user);
    
    // Redirect to frontend with tokens and user info
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    
    redirectUrl.searchParams.set('token', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
    redirectUrl.searchParams.set('provider', 'github');
    redirectUrl.searchParams.set('userId', user.id);
    redirectUrl.searchParams.set('role', user.role);
    
    res.redirect(redirectUrl.toString());
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
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      // Memberships are optional and may not exist in legacy DBs yet.
      organizations: user.organizationMemberships?.map?.((m: any) => ({
        id: m.organization?.id,
        name: m.organization?.name,
        role: m.role,
      })) || [],
    };
  }
}

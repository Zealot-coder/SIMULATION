import { Injectable, Logger } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GitHubOAuthGuard extends AuthGuard('github') {
  private readonly logger = new Logger(GitHubOAuthGuard.name);

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest() as any;
    const protoHeader = (req.headers?.['x-forwarded-proto'] || req.protocol) as
      | string
      | string[]
      | undefined;
    const hostHeader = (req.headers?.['x-forwarded-host'] || req.headers?.host) as
      | string
      | string[]
      | undefined;

    const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    const path = String(req.originalUrl || '').split('?')[0];

    if (proto && host && path) {
      return { callbackURL: `${proto}://${host}${path}` };
    }
    return {};
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ) {
    if (!user || err) {
      const req = context.switchToHttp().getRequest() as any;
      const message = String(
        err?.message ||
          info?.message ||
          info?.toString?.() ||
          'OAuth authentication failed',
      ).slice(0, 500);

      req.oauthError = message;
      this.logger.warn(`GitHub OAuth failed: ${message}`);
      return null;
    }

    return user;
  }
}

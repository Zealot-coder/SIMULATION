import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { CorrelationContextService } from '../context/correlation-context.service';
import { RequestWithContext } from '../interfaces/request-context.interface';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(
    private readonly correlationContext: CorrelationContextService,
    private readonly logger: AppLoggerService,
  ) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const correlationId = this.resolveCorrelationId(req);
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    const start = process.hrtime.bigint();
    this.correlationContext.runWithContext({ correlationId }, () => {
      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.logger.info('HTTP request completed', {
          service: 'http',
          correlationId,
          method: req.method,
          route: req.route?.path ?? req.path,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs,
          organizationId:
            req.organization?.id ??
            this.getOptionalString((req.body as Record<string, unknown>)?.organizationId) ??
            this.getOptionalString((req.query as Record<string, unknown>)?.organizationId),
          userId: req.user?.id,
        });
      });

      next();
    });
  }

  private resolveCorrelationId(req: RequestWithContext): string {
    const incomingHeader = req.headers['x-correlation-id'];
    const incomingValue = Array.isArray(incomingHeader) ? incomingHeader[0] : incomingHeader;
    if (incomingValue && incomingValue.trim().length > 0) {
      return incomingValue.trim();
    }

    return `req_${randomUUID()}`;
  }

  private getOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    return undefined;
  }
}

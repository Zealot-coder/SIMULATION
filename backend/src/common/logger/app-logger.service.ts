import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CorrelationContextService } from '../context/correlation-context.service';

type LogContext = Record<string, unknown>;

@Injectable()
export class AppLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly correlationContext: CorrelationContextService,
  ) {}

  info(message: string, context: LogContext = {}): void {
    this.logger.info(message, this.withContext(context));
  }

  warn(message: string, context: LogContext = {}): void {
    this.logger.warn(message, this.withContext(context));
  }

  debug(message: string, context: LogContext = {}): void {
    this.logger.debug(message, this.withContext(context));
  }

  error(message: string, error?: unknown, context: LogContext = {}): void {
    this.logger.error(message, this.withContext({ ...context, ...this.normalizeError(error) }));
  }

  private withContext(context: LogContext): LogContext {
    const store = this.correlationContext.getStore();
    const merged: LogContext = { ...context };

    if (store?.correlationId && merged.correlationId === undefined) {
      merged.correlationId = store.correlationId;
    }

    if (store?.organizationId && merged.organizationId === undefined) {
      merged.organizationId = store.organizationId;
    }

    if (store?.userId && merged.userId === undefined) {
      merged.userId = store.userId;
    }

    return merged;
  }

  private normalizeError(error: unknown): LogContext {
    if (!error) {
      return {};
    }

    if (error instanceof Error) {
      return {
        error: error.message,
        stack: error.stack,
      };
    }

    return {
      error: typeof error === 'string' ? error : JSON.stringify(error),
    };
  }
}

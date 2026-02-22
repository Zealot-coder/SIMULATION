import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { RequestWithContext } from '../common/interfaces/request-context.interface';
import { buildRequestFingerprint } from './idempotency-fingerprint.util';
import { IdempotencyService } from './idempotency.service';
import { resolveIdempotencyRoutePolicy } from './idempotency-policy';
import { AppLoggerService } from '../common/logger/app-logger.service';

interface RouteOrganizationHints {
  routePath: string;
  method: string;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const response = context.switchToHttp().getResponse();
    const method = request.method.toUpperCase();
    const fullPath = request.originalUrl || request.url;
    const policy = resolveIdempotencyRoutePolicy(method, fullPath);

    if (!policy.enabled) {
      return next.handle();
    }

    const key = this.extractIdempotencyKey(request);
    if (!key) {
      return next.handle();
    }

    const routePath = policy.normalizedPath;
    const actorUserId = this.extractActorUserId(request);

    return from(
      this.resolveOrganizationId(request, { routePath, method }).then((organizationId) => {
        if (!organizationId) {
          return null;
        }

        const fingerprint = buildRequestFingerprint({
          method,
          path: routePath,
          body: request.body ?? {},
          organizationId,
          actorUserId,
        });

        return {
          organizationId,
          actorUserId,
          scope: `api:${method}:${routePath}:actor:${actorUserId || 'anonymous'}`,
          key,
          requestFingerprint: fingerprint,
          correlationId: request.correlationId,
        };
      }),
    ).pipe(
      mergeMap((operation) => {
        if (!operation) {
          this.logger.warn('Skipping idempotency due to missing organization scope', {
            service: 'idempotency',
            routePath,
            method,
            userId: actorUserId,
            correlationId: request.correlationId,
          });
          return next.handle();
        }

        return from(this.idempotencyService.beginApiOperation(operation)).pipe(
          mergeMap((decision) => {
            response.setHeader('X-Idempotency-Key', key);

            if (decision.type === 'conflict') {
              response.setHeader('X-Idempotency-Status', 'CONFLICT');
              request.idempotency = {
                key,
                status: 'CONFLICT',
                scope: operation.scope,
              };
              throw new ConflictException('Idempotency key reused with different payload');
            }

            if (decision.type === 'in_progress') {
              response.setHeader('X-Idempotency-Status', 'IN_PROGRESS');
              request.idempotency = {
                key,
                status: 'IN_PROGRESS',
                scope: operation.scope,
              };
              response.status(202);
              return of({
                status: 'processing',
                message: 'Request with this Idempotency-Key is still processing',
              });
            }

            if (decision.type === 'cached_success') {
              response.setHeader('X-Idempotency-Status', 'HIT');
              request.idempotency = {
                key,
                status: 'HIT',
                scope: operation.scope,
              };
              response.status(decision.statusCode);
              return of(decision.body);
            }

            if (decision.type === 'cached_error') {
              response.setHeader('X-Idempotency-Status', 'HIT');
              request.idempotency = {
                key,
                status: 'HIT',
                scope: operation.scope,
              };
              throw new HttpException(decision.body ?? { message: 'Request failed' }, decision.statusCode);
            }

            response.setHeader('X-Idempotency-Status', 'MISS');
            request.idempotency = {
              key,
              status: 'MISS',
              scope: operation.scope,
            };

            return next.handle().pipe(
              mergeMap((result) =>
                from(
                  this.idempotencyService.finalizeApiSuccess({
                    entryId: decision.entryId,
                    responseCode: response.statusCode,
                    responseBody: result,
                  }),
                ).pipe(mergeMap(() => of(result))),
              ),
              catchError((error) => {
                const { statusCode, payload, cacheable } = this.normalizeError(error);
                return from(
                  this.idempotencyService.finalizeApiFailure({
                    entryId: decision.entryId,
                    responseCode: statusCode,
                    errorBody: payload,
                    cacheable,
                  }),
                ).pipe(mergeMap(() => throwError(() => error)));
              }),
            );
          }),
        );
      }),
    );
  }

  private extractIdempotencyKey(request: RequestWithContext): string | undefined {
    const value = request.headers['idempotency-key'];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (Array.isArray(value) && value[0]) {
      return String(value[0]).trim();
    }

    return undefined;
  }

  private extractActorUserId(request: RequestWithContext): string | undefined {
    if (request.user && typeof request.user.id === 'string' && request.user.id.length > 0) {
      return request.user.id;
    }

    return undefined;
  }

  private async resolveOrganizationId(
    request: RequestWithContext,
    hints: RouteOrganizationHints,
  ): Promise<string | undefined> {
    if (request.organization?.id && typeof request.organization.id === 'string') {
      return request.organization.id;
    }

    if (typeof request.params?.organizationId === 'string' && request.params.organizationId.length > 0) {
      return request.params.organizationId;
    }

    if (
      hints.routePath.startsWith('/organizations/') &&
      hints.routePath.endsWith('/members') &&
      typeof request.params?.id === 'string' &&
      request.params.id.length > 0
    ) {
      return request.params.id;
    }

    if (request.body && typeof request.body === 'object') {
      const bodyOrgId = (request.body as Record<string, unknown>).organizationId;
      if (typeof bodyOrgId === 'string' && bodyOrgId.length > 0) {
        return bodyOrgId;
      }
    }

    if (request.query && typeof request.query === 'object') {
      const queryOrgId = (request.query as Record<string, unknown>).organizationId;
      if (typeof queryOrgId === 'string' && queryOrgId.length > 0) {
        return queryOrgId;
      }
    }

    if (hints.routePath.startsWith('/workflow-dlq/') && typeof request.params?.id === 'string') {
      const dlqItem = await this.prisma.workflowStepDlqItem.findUnique({
        where: { id: request.params.id },
        select: {
          organizationId: true,
        },
      });

      return dlqItem?.organizationId;
    }

    if (hints.routePath.startsWith('/workflows/') && hints.method === 'PUT' && typeof request.params?.id === 'string') {
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: request.params.id },
        select: {
          organizationId: true,
        },
      });

      return workflow?.organizationId;
    }

    return undefined;
  }

  private normalizeError(error: unknown): {
    statusCode: number;
    payload: unknown;
    cacheable: boolean;
  } {
    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      return {
        statusCode,
        payload: error.getResponse(),
        cacheable: statusCode >= 400 && statusCode < 500,
      };
    }

    return {
      statusCode: 500,
      payload: {
        message: 'Internal server error',
      },
      cacheable: false,
    };
  }
}

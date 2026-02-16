import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CorrelationContextService } from '../context/correlation-context.service';
import { RequestWithContext } from '../interfaces/request-context.interface';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly correlationContext: CorrelationContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (request.user?.id) {
      this.correlationContext.setUserId(request.user.id);
    }

    const organizationId = this.resolveOrganizationId(request);
    if (organizationId) {
      this.correlationContext.setOrganizationId(organizationId);
    }

    return next.handle();
  }

  private resolveOrganizationId(request: RequestWithContext): string | undefined {
    if (request.organization?.id) {
      return request.organization.id;
    }

    if (typeof request.body === 'object' && request.body !== null) {
      const bodyValue = (request.body as Record<string, unknown>).organizationId;
      if (typeof bodyValue === 'string' && bodyValue.length > 0) {
        return bodyValue;
      }
    }

    if (typeof request.query === 'object' && request.query !== null) {
      const queryValue = (request.query as Record<string, unknown>).organizationId;
      if (typeof queryValue === 'string' && queryValue.length > 0) {
        return queryValue;
      }
    }

    return undefined;
  }
}

import { ConflictException } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';

function createHttpExecutionContext(request: any, response: any): any {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };
}

describe('IdempotencyInterceptor', () => {
  it('returns 409 conflict for same key with different fingerprint', async () => {
    const idempotencyService = {
      beginApiOperation: jest.fn(async () => ({ type: 'conflict' as const })),
    };
    const prisma = {
      workflowStepDlqItem: { findUnique: jest.fn() },
      workflow: { findUnique: jest.fn() },
    };
    const logger = { warn: jest.fn() };

    const interceptor = new IdempotencyInterceptor(
      idempotencyService as any,
      prisma as any,
      logger as any,
    );

    const request = {
      method: 'POST',
      originalUrl: '/api/v1/events',
      url: '/api/v1/events',
      headers: {
        'idempotency-key': 'idem-1',
      },
      body: { organizationId: 'org-1', value: 1 },
      user: { id: 'user-1' },
      organization: { id: 'org-1' },
      params: {},
      query: {},
    };
    const response = {
      statusCode: 201,
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    const context = createHttpExecutionContext(request, response);

    const next = {
      handle: jest.fn(() => of({ created: true })),
    };

    await expect(lastValueFrom(interceptor.intercept(context, next as any))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('replays cached response for repeated key', async () => {
    const idempotencyService = {
      beginApiOperation: jest.fn(async () => ({
        type: 'cached_success' as const,
        statusCode: 201,
        body: { id: 'evt-1' },
      })),
    };
    const prisma = {
      workflowStepDlqItem: { findUnique: jest.fn() },
      workflow: { findUnique: jest.fn() },
    };
    const logger = { warn: jest.fn() };

    const interceptor = new IdempotencyInterceptor(
      idempotencyService as any,
      prisma as any,
      logger as any,
    );

    const request = {
      method: 'POST',
      originalUrl: '/api/v1/events',
      url: '/api/v1/events',
      headers: {
        'idempotency-key': 'idem-2',
      },
      body: { organizationId: 'org-1', value: 1 },
      user: { id: 'user-1' },
      organization: { id: 'org-1' },
      params: {},
      query: {},
    };
    const response = {
      statusCode: 201,
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    const context = createHttpExecutionContext(request, response);
    const next = {
      handle: jest.fn(() => of({ created: true })),
    };

    const result = await lastValueFrom(interceptor.intercept(context, next as any));
    expect(result).toEqual({ id: 'evt-1' });
    expect(next.handle).not.toHaveBeenCalled();
  });
});

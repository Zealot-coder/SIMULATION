import { WebhookService } from './webhook.service';

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}), { virtual: true });
jest.mock('nest-winston', () => ({
  WINSTON_MODULE_PROVIDER: 'WINSTON_MODULE_PROVIDER',
}), { virtual: true });
jest.mock('winston', () => ({}), { virtual: true });
jest.mock('@willsoto/nestjs-prometheus', () => ({
  InjectMetric: () => () => undefined,
}), { virtual: true });
jest.mock('prom-client', () => ({
  Counter: class {},
  Gauge: class {},
  Histogram: class {},
}), { virtual: true });

describe('WebhookService dedup integration', () => {
  it('deduplicates concurrent webhook requests and processes side effects once', async () => {
    const dedupState = new Set<string>();

    const prisma = {
      organization: {
        findUnique: jest.fn(async ({ where: { id } }: any) => (id === 'org-1' ? { id } : null)),
      },
      webhookDedup: {
        create: jest.fn(async ({ data }: any) => {
          const key = `${data.organizationId}:${data.provider}:${data.dedupKey}`;
          if (dedupState.has(key)) {
            const error: any = new Error('Unique violation');
            error.code = 'P2002';
            throw error;
          }
          dedupState.add(key);
          return {
            id: 'wd-1',
            ...data,
          };
        }),
      },
    };

    const eventService = {
      create: jest.fn(async () => ({ id: 'evt-1' })),
    };
    const configService = {
      get: jest.fn(() => '24'),
    };
    const metrics = {
      incrementWebhookDuplicate: jest.fn(),
    };
    const logger = {
      info: jest.fn(),
    };
    const paymentIdempotencyService = {
      guardWebhookPayment: jest.fn(async () => ({ duplicate: false })),
    };
    const communicationService = {
      applyDeliveryStatusFromWebhook: jest.fn(async () => ({ updated: false })),
    };

    const service = new WebhookService(
      prisma as any,
      eventService as any,
      configService as any,
      metrics as any,
      logger as any,
      paymentIdempotencyService as any,
      communicationService as any,
    );

    const payload = {
      transactionId: 'tx-123',
      amount: 100,
    };
    const headers = {
      'x-webhook-signature': 'sig-1',
      'x-webhook-timestamp': '1700000000',
    };

    const [r1, r2] = await Promise.all([
      service.ingest({
        provider: 'momo',
        organizationId: 'org-1',
        payload,
        headers,
      }),
      service.ingest({
        provider: 'momo',
        organizationId: 'org-1',
        payload,
        headers,
      }),
    ]);

    const duplicateCount = [r1, r2].filter((entry) => entry.duplicate).length;
    const processedCount = [r1, r2].filter((entry) => !entry.duplicate).length;

    expect(duplicateCount).toBe(1);
    expect(processedCount).toBe(1);
    expect(eventService.create).toHaveBeenCalledTimes(1);
    expect(paymentIdempotencyService.guardWebhookPayment).toHaveBeenCalledTimes(1);
  });
});

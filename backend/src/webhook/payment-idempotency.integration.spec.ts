import { PaymentIdempotencyService } from './payment-idempotency.service';

describe('PaymentIdempotencyService integration', () => {
  it('treats duplicate payment confirmations as duplicates and prevents double processing', async () => {
    const acquisitionState = new Set<string>();

    const idempotencyService = {
      tryAcquireScopedKey: jest.fn(async (params: any) => {
        const key = `${params.organizationId}:${params.scope}:${params.key}`;
        if (acquisitionState.has(key)) {
          return false;
        }
        acquisitionState.add(key);
        return true;
      }),
    };

    const metrics = {
      incrementPaymentDuplicate: jest.fn(),
    };
    const logger = {
      warn: jest.fn(),
    };

    const service = new PaymentIdempotencyService(
      idempotencyService as any,
      metrics as any,
      logger as any,
    );

    const payload = {
      transactionId: 'tx-001',
      orderId: 'order-1',
      amount: 1000,
      phone: '+255700000001',
    };

    const first = await service.guardWebhookPayment({
      organizationId: 'org-1',
      provider: 'momo',
      payload,
    });

    const second = await service.guardWebhookPayment({
      organizationId: 'org-1',
      provider: 'momo',
      payload,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(metrics.incrementPaymentDuplicate).toHaveBeenCalledTimes(1);
    expect(second.reason).toBe('duplicate_payment_confirmation');
  });
});

import { Injectable } from '@nestjs/common';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { stableObjectHash } from '../idempotency/idempotency-fingerprint.util';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { AppLoggerService } from '../common/logger/app-logger.service';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function firstString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function firstNumber(payload: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function normalizePhone(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/[^\d+]/g, '');
  return digits.length > 0 ? digits : undefined;
}

@Injectable()
export class PaymentIdempotencyService {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly metrics: WorkflowMetrics,
    private readonly logger: AppLoggerService,
  ) {}

  async guardWebhookPayment(params: {
    organizationId: string;
    provider: string;
    payload: unknown;
  }): Promise<{ duplicate: boolean; reason?: string }> {
    const provider = params.provider.toLowerCase();
    const payload = asRecord(params.payload);

    const providerTxId = firstString(payload, [
      'transactionId',
      'transaction_id',
      'providerTransactionId',
      'provider_transaction_id',
      'reference',
      'externalId',
      'txid',
      'tx_id',
    ]);

    if (providerTxId) {
      const confirmationKey = `provider:${provider}:tx:${providerTxId}`;
      const confirmationFingerprint = stableObjectHash({
        provider,
        providerTxId,
      });

      const confirmationAccepted = await this.idempotencyService.tryAcquireScopedKey({
        organizationId: params.organizationId,
        scope: 'payment_confirmation',
        key: confirmationKey,
        requestFingerprint: confirmationFingerprint,
      });

      if (!confirmationAccepted) {
        this.metrics.incrementPaymentDuplicate('payment_confirmation', params.organizationId);
        this.logger.warn('Duplicate payment confirmation ignored', {
          service: 'payment-idempotency',
          organizationId: params.organizationId,
          provider,
          providerTxId,
        });
        return { duplicate: true, reason: 'duplicate_payment_confirmation' };
      }
    }

    const orderId = firstString(payload, ['orderId', 'order_id', 'invoiceId', 'invoice_id']);
    const amount = firstNumber(payload, ['amount', 'total', 'value']);
    const phone = normalizePhone(firstString(payload, ['phone', 'msisdn', 'mobile', 'customerPhone']));

    if (orderId && typeof amount === 'number' && phone) {
      const paymentRequestKey = `provider:${provider}:order:${orderId}:amount:${amount}:phone:${phone}`;
      const requestFingerprint = stableObjectHash({
        provider,
        orderId,
        amount,
        phone,
      });

      const requestAccepted = await this.idempotencyService.tryAcquireScopedKey({
        organizationId: params.organizationId,
        scope: 'payment_request',
        key: paymentRequestKey,
        requestFingerprint: requestFingerprint,
      });

      if (!requestAccepted) {
        this.metrics.incrementPaymentDuplicate('payment_request', params.organizationId);
        this.logger.warn('Duplicate payment request intent ignored', {
          service: 'payment-idempotency',
          organizationId: params.organizationId,
          provider,
          orderId,
          amount,
        });
        return { duplicate: true, reason: 'duplicate_payment_request' };
      }
    }

    return { duplicate: false };
  }
}

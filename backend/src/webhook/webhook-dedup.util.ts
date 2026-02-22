import { canonicalJson, sha256Hex } from '../idempotency/idempotency-fingerprint.util';

export type SupportedWebhookProvider = 'whatsapp' | 'momo' | 'custom';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getByPath(payload: unknown, path: string): unknown {
  const pathParts = path.split('.');
  let current: unknown = payload;

  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    const index = Number(part);
    if (Number.isInteger(index) && Array.isArray(current)) {
      current = current[index];
      continue;
    }

    if (typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function firstString(payload: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const value = getByPath(payload, path);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function fallbackKey(payload: unknown, signature?: string, timestamp?: string): string {
  const signaturePart = signature || 'no-signature';
  const timestampPart = timestamp || 'no-timestamp';
  return sha256Hex(`${signaturePart}:${timestampPart}:${canonicalJson(payload)}`);
}

export function extractWebhookDedupKey(params: {
  provider: SupportedWebhookProvider;
  payload: unknown;
  headers: Record<string, string | undefined>;
}): string {
  const provider = params.provider;
  const payload = params.payload;
  const headers = asRecord(params.headers);
  const signature =
    typeof headers['x-webhook-signature'] === 'string'
      ? (headers['x-webhook-signature'] as string)
      : typeof headers['x-signature'] === 'string'
        ? (headers['x-signature'] as string)
        : undefined;
  const timestamp =
    typeof headers['x-webhook-timestamp'] === 'string'
      ? (headers['x-webhook-timestamp'] as string)
      : typeof headers['x-timestamp'] === 'string'
        ? (headers['x-timestamp'] as string)
        : undefined;

  if (provider === 'whatsapp') {
    const messageId = firstString(payload, [
      'entry.0.changes.0.value.messages.0.id',
      'entry.0.changes.0.value.statuses.0.id',
      'messages.0.id',
      'message.id',
      'eventId',
      'id',
    ]);
    if (messageId) {
      return messageId;
    }
  }

  if (provider === 'momo') {
    const transactionId = firstString(payload, [
      'transactionId',
      'transaction_id',
      'providerTransactionId',
      'provider_transaction_id',
      'reference',
      'externalId',
      'txid',
      'tx_id',
      'data.transactionId',
      'data.reference',
    ]);
    if (transactionId) {
      return transactionId;
    }
  }

  return fallbackKey(payload, signature, timestamp);
}

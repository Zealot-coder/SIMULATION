import { createHash } from 'node:crypto';

const VOLATILE_FIELD_NAMES = new Set([
  'timestamp',
  'timeStamp',
  'createdAt',
  'updatedAt',
  'lastUpdatedAt',
  'processedAt',
  'receivedAt',
  'nonce',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function canonicalizeValue(value: unknown, stripVolatileFields: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry, stripVolatileFields));
  }

  if (isPlainObject(value)) {
    const sortedKeys = Object.keys(value).sort();
    const normalized: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      if (stripVolatileFields && VOLATILE_FIELD_NAMES.has(key)) {
        continue;
      }

      const nestedValue = value[key];
      if (nestedValue === undefined) {
        continue;
      }

      normalized[key] = canonicalizeValue(nestedValue, stripVolatileFields);
    }

    return normalized;
  }

  return value;
}

export function canonicalJson(value: unknown, stripVolatileFields = false): string {
  return JSON.stringify(canonicalizeValue(value, stripVolatileFields));
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function stableObjectHash(value: unknown, stripVolatileFields = false): string {
  return sha256Hex(canonicalJson(value, stripVolatileFields));
}

export function buildRequestFingerprint(params: {
  method: string;
  path: string;
  body: unknown;
  organizationId: string;
  actorUserId?: string | null;
}): string {
  const signature = [
    params.method.toUpperCase(),
    params.path,
    canonicalJson(params.body ?? {}),
    params.organizationId,
    params.actorUserId || 'anonymous',
  ].join(':');

  return sha256Hex(signature);
}

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'access',
  'refresh',
  'credential',
  'client_secret',
  'private_key',
];

const PHONE_KEY_PATTERNS = ['phone', 'msisdn', 'mobile', 'contact'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isPhoneKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return PHONE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function maskPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) {
    return '[MASKED_PHONE]';
  }

  const lastTwo = digits.slice(-2);
  const firstTwo = digits.slice(0, 2);
  return `${firstTwo}${'*'.repeat(Math.max(2, digits.length - 4))}${lastTwo}`;
}

function sanitizeValue(value: unknown, visited: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, visited));
  }

  if (!isPlainObject(value)) {
    if (typeof value === 'string' && /^\+?\d{8,15}$/.test(value)) {
      return maskPhoneNumber(value);
    }
    return value;
  }

  if (visited.has(value)) {
    return '[CIRCULAR]';
  }
  visited.add(value);

  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = REDACTED;
      continue;
    }

    if (isPhoneKey(key) && typeof entry === 'string') {
      sanitized[key] = maskPhoneNumber(entry);
      continue;
    }

    sanitized[key] = sanitizeValue(entry, visited);
  }

  return sanitized;
}

export function sanitizeIdempotencyPayload(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  return sanitizeValue(value, new WeakSet<object>());
}

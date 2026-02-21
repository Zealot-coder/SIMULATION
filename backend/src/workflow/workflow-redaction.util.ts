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

export function redactSensitiveData(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>());
}

function redactValue(value: unknown, visited: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, visited));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (visited.has(record)) {
    return '[CIRCULAR]';
  }
  visited.add(record);

  const sanitized: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = REDACTED;
      continue;
    }

    sanitized[key] = redactValue(entry, visited);
  }

  return sanitized;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

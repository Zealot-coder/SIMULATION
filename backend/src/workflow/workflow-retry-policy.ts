export type WorkflowRetryClass =
  | 'messaging'
  | 'payment_request'
  | 'http_call'
  | 'webhook'
  | 'db_write'
  | 'validation'
  | 'config';

export interface WorkflowRetryPolicy {
  baseDelayMs: number;
  factor: number;
  maxDelayMs: number;
  jitterRatio: number;
  maxRetries: number;
}

export interface WorkflowRetryPolicyOverrides {
  baseDelayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  maxRetries?: number;
}

const DEFAULT_BASE_DELAY_MS = 2000;
const DEFAULT_FACTOR = 2;
const DEFAULT_MAX_DELAY_MS = 120000;
const DEFAULT_JITTER_RATIO = 0.25;

const DEFAULT_MAX_RETRIES: Record<WorkflowRetryClass, number> = {
  messaging: 5,
  payment_request: 6,
  http_call: 5,
  webhook: 5,
  db_write: 3,
  validation: 0,
  config: 0,
};

export function getStepRetryClass(stepType: string): WorkflowRetryClass {
  const normalized = stepType.trim().toLowerCase();

  if (normalized === 'send_message' || normalized === 'messaging') {
    return 'messaging';
  }

  if (normalized === 'payment_request') {
    return 'payment_request';
  }

  if (normalized === 'http_call') {
    return 'http_call';
  }

  if (normalized === 'webhook') {
    return 'webhook';
  }

  if (normalized === 'db_write' || normalized === 'update_record') {
    return 'db_write';
  }

  if (normalized === 'validation') {
    return 'validation';
  }

  if (normalized === 'config') {
    return 'config';
  }

  if (normalized === 'ai_process') {
    return 'http_call';
  }

  if (normalized === 'wait' || normalized === 'approval') {
    return 'validation';
  }

  return 'validation';
}

export function getDefaultRetryPolicyForStep(stepType: string): WorkflowRetryPolicy {
  const retryClass = getStepRetryClass(stepType);
  return {
    baseDelayMs: DEFAULT_BASE_DELAY_MS,
    factor: DEFAULT_FACTOR,
    maxDelayMs: DEFAULT_MAX_DELAY_MS,
    jitterRatio: DEFAULT_JITTER_RATIO,
    maxRetries: DEFAULT_MAX_RETRIES[retryClass],
  };
}

export function resolveRetryPolicy(
  stepType: string,
  overrides?: WorkflowRetryPolicyOverrides,
): WorkflowRetryPolicy {
  const defaults = getDefaultRetryPolicyForStep(stepType);

  return {
    baseDelayMs: clampPositiveInteger(overrides?.baseDelayMs, defaults.baseDelayMs),
    factor: clampPositiveNumber(overrides?.factor, defaults.factor),
    maxDelayMs: clampPositiveInteger(overrides?.maxDelayMs, defaults.maxDelayMs),
    jitterRatio: clampRatio(overrides?.jitterRatio, defaults.jitterRatio),
    maxRetries: clampNonNegativeInteger(overrides?.maxRetries, defaults.maxRetries),
  };
}

export function calculateRetryDelayMs(
  attempt: number,
  policy: WorkflowRetryPolicy,
  randomFn: () => number = Math.random,
): number {
  if (!Number.isFinite(attempt) || attempt < 1) {
    throw new Error('attempt must be >= 1');
  }

  const baseDelay = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * policy.factor ** (attempt - 1),
  );

  const minJitter = baseDelay * (1 - policy.jitterRatio);
  const maxJitter = baseDelay * (1 + policy.jitterRatio);
  const random = clampRatio(randomFn(), 0);

  return Math.round(minJitter + (maxJitter - minJitter) * random);
}

function clampPositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value as number));
}

function clampPositiveNumber(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, value as number);
}

function clampNonNegativeInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value as number));
}

function clampRatio(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value as number));
}

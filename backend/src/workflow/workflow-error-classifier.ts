export type WorkflowErrorCategory =
  | 'timeout'
  | 'provider_5xx'
  | 'rate_limit'
  | 'transient_network'
  | 'validation'
  | 'missing_config'
  | 'provider_4xx'
  | 'unknown';

export interface WorkflowErrorClassification {
  category: WorkflowErrorCategory;
  retriable: boolean;
  message: string;
  stack?: string;
}

const RETRIABLE_CATEGORIES: Set<WorkflowErrorCategory> = new Set([
  'timeout',
  'provider_5xx',
  'rate_limit',
  'transient_network',
]);

export function errorCategory(error: unknown): WorkflowErrorCategory {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout')
  ) {
    return 'timeout';
  }

  if (
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('ehostunreach') ||
    message.includes('network') ||
    message.includes('socket hang up')
  ) {
    return 'transient_network';
  }

  if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
    return 'rate_limit';
  }

  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('bad gateway') ||
    message.includes('service unavailable') ||
    message.includes('internal server error')
  ) {
    return 'provider_5xx';
  }

  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404') ||
    message.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('not found')
  ) {
    return 'provider_4xx';
  }

  if (
    message.includes('missing config') ||
    message.includes('not configured') ||
    message.includes('requires a valid') ||
    message.includes('unknown step type')
  ) {
    return 'missing_config';
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('unprocessable') ||
    message.includes('schema') ||
    message.includes('bad request') ||
    message.includes('422')
  ) {
    return 'validation';
  }

  return 'unknown';
}

export function isRetriable(error: unknown): boolean {
  return RETRIABLE_CATEGORIES.has(errorCategory(error));
}

export function classifyWorkflowError(error: unknown): WorkflowErrorClassification {
  const message = getErrorMessage(error);
  const category = errorCategory(error);

  return {
    category,
    retriable: RETRIABLE_CATEGORIES.has(category),
    message,
    stack: error instanceof Error ? error.stack : undefined,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return 'Unknown error';
}

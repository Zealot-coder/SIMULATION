import {
  classifyWorkflowError,
  errorCategory,
  isRetriable,
} from './workflow-error-classifier';

describe('workflow-error-classifier', () => {
  it('marks timeout errors as retriable', () => {
    const error = new Error('Request timed out after 30s');
    expect(errorCategory(error)).toBe('timeout');
    expect(isRetriable(error)).toBe(true);
    expect(classifyWorkflowError(error).retriable).toBe(true);
  });

  it('marks transient network errors as retriable', () => {
    const error = new Error('ECONNRESET while contacting provider');
    expect(errorCategory(error)).toBe('transient_network');
    expect(isRetriable(error)).toBe(true);
  });

  it('marks rate limit and 5xx errors as retriable', () => {
    const rateLimited = new Error('429 too many requests');
    const provider5xx = new Error('503 service unavailable');

    expect(errorCategory(rateLimited)).toBe('rate_limit');
    expect(isRetriable(rateLimited)).toBe(true);

    expect(errorCategory(provider5xx)).toBe('provider_5xx');
    expect(isRetriable(provider5xx)).toBe(true);
  });

  it('marks validation, missing config, and unknown step errors as non-retriable', () => {
    const validation = new Error('validation failed: invalid payload');
    const missingConfig = new Error('send_message step requires a valid channel in config.channel');
    const unknownStep = new Error('Unknown step type: random_custom_step');

    expect(errorCategory(validation)).toBe('validation');
    expect(isRetriable(validation)).toBe(false);

    expect(errorCategory(missingConfig)).toBe('missing_config');
    expect(isRetriable(missingConfig)).toBe(false);

    expect(errorCategory(unknownStep)).toBe('missing_config');
    expect(isRetriable(unknownStep)).toBe(false);
  });
});

import {
  calculateRetryDelayMs,
  getDefaultRetryPolicyForStep,
  resolveRetryPolicy,
} from './workflow-retry-policy';

describe('workflow-retry-policy', () => {
  it('applies the exponential delay formula by attempt number', () => {
    const policy = resolveRetryPolicy('http_call', {
      baseDelayMs: 2000,
      factor: 2,
      maxDelayMs: 120000,
      jitterRatio: 0,
      maxRetries: 5,
    });

    expect(calculateRetryDelayMs(1, policy, () => 0.5)).toBe(2000);
    expect(calculateRetryDelayMs(2, policy, () => 0.5)).toBe(4000);
    expect(calculateRetryDelayMs(3, policy, () => 0.5)).toBe(8000);
  });

  it('caps delay at maxDelayMs', () => {
    const policy = resolveRetryPolicy('http_call', {
      baseDelayMs: 2000,
      factor: 2,
      maxDelayMs: 5000,
      jitterRatio: 0,
    });

    expect(calculateRetryDelayMs(1, policy, () => 0.5)).toBe(2000);
    expect(calculateRetryDelayMs(2, policy, () => 0.5)).toBe(4000);
    expect(calculateRetryDelayMs(3, policy, () => 0.5)).toBe(5000);
    expect(calculateRetryDelayMs(5, policy, () => 0.5)).toBe(5000);
  });

  it('stays within jitter bounds for random=0, 0.5, 1', () => {
    const policy = resolveRetryPolicy('http_call', {
      baseDelayMs: 2000,
      factor: 2,
      maxDelayMs: 120000,
      jitterRatio: 0.25,
      maxRetries: 5,
    });

    expect(calculateRetryDelayMs(1, policy, () => 0)).toBe(1500);
    expect(calculateRetryDelayMs(1, policy, () => 0.5)).toBe(2000);
    expect(calculateRetryDelayMs(1, policy, () => 1)).toBe(2500);
  });

  it('uses required per-step default maxRetries', () => {
    expect(getDefaultRetryPolicyForStep('send_message').maxRetries).toBe(5);
    expect(getDefaultRetryPolicyForStep('payment_request').maxRetries).toBe(6);
    expect(getDefaultRetryPolicyForStep('http_call').maxRetries).toBe(5);
    expect(getDefaultRetryPolicyForStep('webhook').maxRetries).toBe(5);
    expect(getDefaultRetryPolicyForStep('db_write').maxRetries).toBe(3);
    expect(getDefaultRetryPolicyForStep('validation').maxRetries).toBe(0);
    expect(getDefaultRetryPolicyForStep('config').maxRetries).toBe(0);
  });
});

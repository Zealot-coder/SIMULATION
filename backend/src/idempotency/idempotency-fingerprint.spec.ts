import { buildRequestFingerprint, canonicalJson, stableObjectHash } from './idempotency-fingerprint.util';

describe('idempotency fingerprint utilities', () => {
  it('produces stable canonical JSON for different key orderings', () => {
    const a = { z: 1, a: { y: 'x', b: 2 } };
    const b = { a: { b: 2, y: 'x' }, z: 1 };

    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(stableObjectHash(a)).toBe(stableObjectHash(b));
  });

  it('generates different fingerprints for different payloads', () => {
    const fp1 = buildRequestFingerprint({
      method: 'POST',
      path: '/events',
      body: { value: 1 },
      organizationId: 'org-1',
      actorUserId: 'user-1',
    });
    const fp2 = buildRequestFingerprint({
      method: 'POST',
      path: '/events',
      body: { value: 2 },
      organizationId: 'org-1',
      actorUserId: 'user-1',
    });

    expect(fp1).not.toBe(fp2);
  });

  it('ignores volatile fields when requested', () => {
    const hashA = stableObjectHash(
      {
        amount: 100,
        createdAt: '2026-01-01T00:00:00Z',
        nested: { timestamp: '2026-01-01T00:00:00Z', value: 1 },
      },
      true,
    );

    const hashB = stableObjectHash(
      {
        amount: 100,
        createdAt: '2026-01-02T00:00:00Z',
        nested: { timestamp: '2026-01-02T00:00:00Z', value: 1 },
      },
      true,
    );

    expect(hashA).toBe(hashB);
  });
});

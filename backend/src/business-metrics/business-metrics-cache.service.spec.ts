import { BusinessMetricsCacheService } from './business-metrics-cache.service';

jest.mock('nest-winston', () => ({
  WINSTON_MODULE_PROVIDER: 'WINSTON_MODULE_PROVIDER',
}), { virtual: true });
jest.mock('winston', () => ({}), { virtual: true });

describe('BusinessMetricsCacheService', () => {
  function createService() {
    const redisStore = new Map<string, string>();
    const redisClient = {
      async get(key: string) {
        return redisStore.get(key) || null;
      },
      async set(key: string, value: string, _mode: string, _ttl: number) {
        redisStore.set(key, value);
        return 'OK';
      },
      async incr(key: string) {
        const nextValue = (Number(redisStore.get(key) || '0') || 0) + 1;
        redisStore.set(key, String(nextValue));
        return nextValue;
      },
    };

    const workflowQueue = {
      client: Promise.resolve(redisClient),
    };

    const service = new BusinessMetricsCacheService(workflowQueue as any, {
      warn: jest.fn(),
    } as any);

    return service;
  }

  it('serves cached payload until org version changes', async () => {
    const service = createService();

    let resolverCalls = 0;
    const first = await service.getOrSet({
      organizationId: 'org-1',
      scope: 'summary',
      keyPart: 'window-1',
      ttlSeconds: 60,
      resolver: async () => {
        resolverCalls += 1;
        return { value: resolverCalls };
      },
    });
    const second = await service.getOrSet({
      organizationId: 'org-1',
      scope: 'summary',
      keyPart: 'window-1',
      ttlSeconds: 60,
      resolver: async () => {
        resolverCalls += 1;
        return { value: resolverCalls };
      },
    });

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(resolverCalls).toBe(1);

    await service.bumpOrganizationCacheVersion('org-1');

    const third = await service.getOrSet({
      organizationId: 'org-1',
      scope: 'summary',
      keyPart: 'window-1',
      ttlSeconds: 60,
      resolver: async () => {
        resolverCalls += 1;
        return { value: resolverCalls };
      },
    });

    expect(third).toEqual({ value: 2 });
    expect(resolverCalls).toBe(2);
  });

  it('serves cached reads in under 300ms after warm-up', async () => {
    const service = createService();
    let calls = 0;

    await service.getOrSet({
      organizationId: 'org-2',
      scope: 'summary',
      keyPart: 'window-fast',
      ttlSeconds: 60,
      resolver: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 350));
        return { ok: true };
      },
    });

    const start = Date.now();
    await service.getOrSet({
      organizationId: 'org-2',
      scope: 'summary',
      keyPart: 'window-fast',
      ttlSeconds: 60,
      resolver: async () => {
        calls += 1;
        return { ok: false };
      },
    });
    const elapsedMs = Date.now() - start;

    expect(calls).toBe(1);
    expect(elapsedMs).toBeLessThan(300);
  });
});

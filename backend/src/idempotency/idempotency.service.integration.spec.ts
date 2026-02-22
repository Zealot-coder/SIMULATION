import { IdempotencyStatus } from '@prisma/client';
import { IdempotencyService } from './idempotency.service';

interface InMemoryIdempotencyRow {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  scope: string;
  key: string;
  requestFingerprint: string;
  status: IdempotencyStatus;
  responseCode: number | null;
  responseBody: unknown;
  errorBody: unknown;
  lockedAt: Date;
  expiresAt: Date;
}

describe('IdempotencyService integration', () => {
  it('handles concurrent duplicate API requests safely', async () => {
    const rows: InMemoryIdempotencyRow[] = [];

    const prisma = {
      idempotencyKey: {
        create: jest.fn(async ({ data }: any) => {
          const existing = rows.find(
            (row) =>
              row.organizationId === data.organizationId &&
              row.scope === data.scope &&
              row.key === data.key,
          );
          if (existing) {
            const error: any = new Error('Unique violation');
            error.code = 'P2002';
            throw error;
          }

          const row: InMemoryIdempotencyRow = {
            id: `ik-${rows.length + 1}`,
            organizationId: data.organizationId,
            actorUserId: data.actorUserId ?? null,
            scope: data.scope,
            key: data.key,
            requestFingerprint: data.requestFingerprint,
            status: data.status,
            responseCode: data.responseCode ?? null,
            responseBody: null,
            errorBody: null,
            lockedAt: data.lockedAt,
            expiresAt: data.expiresAt,
          };
          rows.push(row);
          return row;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const key = where.organizationId_scope_key;
          return (
            rows.find(
              (row) =>
                row.organizationId === key.organizationId &&
                row.scope === key.scope &&
                row.key === key.key,
            ) || null
          );
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const row of rows) {
            if (where.id && row.id !== where.id) continue;
            if (where.status && row.status !== where.status) continue;
            if (where.expiresAt?.lte && !(row.expiresAt <= where.expiresAt.lte)) continue;
            if (where.lockedAt?.lte && !(row.lockedAt <= where.lockedAt.lte)) continue;

            if (data.actorUserId !== undefined) row.actorUserId = data.actorUserId;
            if (data.requestFingerprint !== undefined) row.requestFingerprint = data.requestFingerprint;
            if (data.status !== undefined) row.status = data.status;
            if (data.responseCode !== undefined) row.responseCode = data.responseCode;
            if (data.responseBody !== undefined) row.responseBody = data.responseBody;
            if (data.errorBody !== undefined) row.errorBody = data.errorBody;
            if (data.lockedAt !== undefined) row.lockedAt = data.lockedAt;
            if (data.expiresAt !== undefined) row.expiresAt = data.expiresAt;
            count += 1;
          }
          return { count };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const row = rows.find((entry) => entry.id === where.id);
          if (!row) {
            throw new Error('Row not found');
          }
          if (data.status !== undefined) row.status = data.status;
          if (data.responseCode !== undefined) row.responseCode = data.responseCode;
          if (data.responseBody !== undefined) row.responseBody = data.responseBody;
          if (data.errorBody !== undefined) row.errorBody = data.errorBody;
          return row;
        }),
      },
      $executeRawUnsafe: jest.fn(async () => 0),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'IDEMPOTENCY_TTL_HOURS') return '24';
        if (key === 'IDEMPOTENCY_IN_PROGRESS_TIMEOUT_SECONDS') return '120';
        return undefined;
      }),
    };
    const metrics = {
      incrementIdempotencyMiss: jest.fn(),
      incrementIdempotencyHit: jest.fn(),
    };
    const logger = {
      info: jest.fn(),
    };

    const service = new IdempotencyService(
      prisma as any,
      configService as any,
      metrics as any,
      logger as any,
    );

    const params = {
      organizationId: 'org-1',
      actorUserId: 'user-1',
      scope: 'api:POST:/events:actor:user-1',
      key: 'idem-key-1',
      requestFingerprint: 'fp-1',
    };

    const [first, second] = await Promise.all([
      service.beginApiOperation(params),
      service.beginApiOperation(params),
    ]);

    expect([first.type, second.type].sort()).toEqual(['in_progress', 'miss']);

    const miss = first.type === 'miss' ? first : second;
    if (miss.type === 'miss') {
      await service.finalizeApiSuccess({
        entryId: miss.entryId,
        responseCode: 201,
        responseBody: { id: 'evt-1' },
      });
    }

    const replay = await service.beginApiOperation(params);
    expect(replay.type).toBe('cached_success');
    if (replay.type === 'cached_success') {
      expect(replay.statusCode).toBe(201);
      expect(replay.body).toEqual({ id: 'evt-1' });
    }
  });
});

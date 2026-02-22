import { StepDedupStatus } from '@prisma/client';
import { WorkflowStepDedupService } from './workflow-step-dedup.service';

interface InMemoryStepDedupRow {
  id: string;
  organizationId: string;
  workflowRunId: string;
  stepKey: string;
  inputHash: string;
  status: StepDedupStatus;
  result: unknown;
  lockedAt: Date;
  expiresAt: Date;
}

describe('WorkflowStepDedupService integration', () => {
  it('prevents duplicate side effects for duplicate step jobs', async () => {
    const rows: InMemoryStepDedupRow[] = [];

    const prisma = {
      stepDedup: {
        create: jest.fn(async ({ data }: any) => {
          const duplicate = rows.find(
            (row) =>
              row.organizationId === data.organizationId &&
              row.workflowRunId === data.workflowRunId &&
              row.stepKey === data.stepKey &&
              row.inputHash === data.inputHash,
          );

          if (duplicate) {
            const error: any = new Error('Unique violation');
            error.code = 'P2002';
            throw error;
          }

          const created: InMemoryStepDedupRow = {
            id: `sd-${rows.length + 1}`,
            organizationId: data.organizationId,
            workflowRunId: data.workflowRunId,
            stepKey: data.stepKey,
            inputHash: data.inputHash,
            status: data.status,
            result: null,
            lockedAt: data.lockedAt,
            expiresAt: data.expiresAt,
          };
          rows.push(created);
          return created;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const key = where.organizationId_workflowRunId_stepKey_inputHash;
          return (
            rows.find(
              (row) =>
                row.organizationId === key.organizationId &&
                row.workflowRunId === key.workflowRunId &&
                row.stepKey === key.stepKey &&
                row.inputHash === key.inputHash,
            ) || null
          );
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const row of rows) {
            if (row.id !== where.id) {
              continue;
            }
            if (where.status && row.status !== where.status) {
              continue;
            }
            if (where.lockedAt?.lte && !(row.lockedAt <= where.lockedAt.lte)) {
              continue;
            }
            if (data.lockedAt) {
              row.lockedAt = data.lockedAt;
            }
            if (data.expiresAt) {
              row.expiresAt = data.expiresAt;
            }
            count += 1;
          }
          return { count };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const row = rows.find((item) => item.id === where.id);
          if (!row) {
            throw new Error('Step dedup row not found');
          }
          row.status = data.status;
          row.result = data.result;
          row.lockedAt = data.lockedAt;
          return row;
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          const before = rows.length;
          for (let index = rows.length - 1; index >= 0; index -= 1) {
            if (rows[index].id === where.id && rows[index].status === where.status) {
              rows.splice(index, 1);
            }
          }
          return { count: before - rows.length };
        }),
      },
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'STEP_DEDUP_TTL_HOURS') return '24';
        if (key === 'STEP_DEDUP_LOCK_TIMEOUT_SECONDS') return '120';
        return undefined;
      }),
    };
    const metrics = {
      incrementStepDuplicate: jest.fn(),
    };
    const logger = {
      warn: jest.fn(),
    };

    const service = new WorkflowStepDedupService(
      prisma as any,
      configService as any,
      metrics as any,
      logger as any,
    );

    const dedupA = await service.acquire({
      organizationId: 'org-1',
      workflowRunId: 'run-1',
      stepKey: '3',
      input: { amount: 100, createdAt: '2026-02-22T00:00:00Z' },
    });
    const dedupB = await service.acquire({
      organizationId: 'org-1',
      workflowRunId: 'run-1',
      stepKey: '3',
      input: { createdAt: '2026-02-23T00:00:00Z', amount: 100 },
    });

    expect(dedupA.type).toBe('acquired');
    expect(dedupB.type).toBe('locked');

    let sideEffectCalls = 0;
    if (dedupA.type === 'acquired') {
      sideEffectCalls += 1;
      await service.markDone(dedupA.lockId, { externalId: 'msg-1' });
    }

    const dedupC = await service.acquire({
      organizationId: 'org-1',
      workflowRunId: 'run-1',
      stepKey: '3',
      input: { amount: 100, createdAt: '2026-02-24T00:00:00Z' },
    });

    expect(dedupC.type).toBe('done');
    expect(sideEffectCalls).toBe(1);
  });
});

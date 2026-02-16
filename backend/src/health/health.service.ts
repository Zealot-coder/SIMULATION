import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';

export type CheckStatus = 'up' | 'down';

export interface CheckResult {
  status: CheckStatus;
  responseTime: number;
  error?: string;
}

export interface QueueCheckResult extends CheckResult {
  jobs: {
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowMetrics: WorkflowMetrics,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
    @InjectQueue('events') private readonly eventQueue: Queue,
  ) {}

  async getHealthStatus(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: string }> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const healthy = database.status === 'up' && redis.status === 'up';

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  async getDetailedHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
      database: CheckResult;
      redis: CheckResult;
      queue: QueueCheckResult;
    };
  }> {
    const [database, redis, queue] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
    ]);

    const allUp = database.status === 'up' && redis.status === 'up' && queue.status === 'up';
    const partiallyUp = [database.status, redis.status, queue.status].includes('up');

    return {
      status: allUp ? 'healthy' : partiallyUp ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        database,
        redis,
        queue,
      },
    };
  }

  private async checkDatabase(): Promise<CheckResult> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return {
        status: 'up',
        responseTime: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const startedAt = Date.now();
    try {
      const redisClient = await this.workflowQueue.client;
      await redisClient.ping();
      return {
        status: 'up',
        responseTime: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown redis error',
      };
    }
  }

  private async checkQueue(): Promise<QueueCheckResult> {
    const startedAt = Date.now();
    try {
      const [workflowCounts, eventCounts] = await Promise.all([
        this.workflowQueue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
        this.eventQueue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
      ]);

      const waiting = (workflowCounts.waiting || 0) + (eventCounts.waiting || 0);
      const active = (workflowCounts.active || 0) + (eventCounts.active || 0);
      const failed = (workflowCounts.failed || 0) + (eventCounts.failed || 0);
      const delayed = (workflowCounts.delayed || 0) + (eventCounts.delayed || 0);

      this.workflowMetrics.setQueueDepth('workflows', workflowCounts.waiting || 0);
      this.workflowMetrics.setQueueDepth('events', eventCounts.waiting || 0);

      return {
        status: 'up',
        responseTime: Date.now() - startedAt,
        jobs: {
          waiting,
          active,
          failed,
          delayed,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown queue error',
        jobs: {
          waiting: 0,
          active: 0,
          failed: 0,
          delayed: 0,
        },
      };
    }
  }
}

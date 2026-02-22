import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { IdempotencyService } from './idempotency.service';
import { AppLoggerService } from '../common/logger/app-logger.service';

const CLEANUP_JOB_NAME = 'idempotency-cleanup';
const CLEANUP_REPEAT_JOB_ID = 'idempotency-cleanup-hourly';

@Injectable()
@Processor('maintenance')
export class IdempotencyCleanupProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    private readonly idempotencyService: IdempotencyService,
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const everyMs = Number(this.configService.get<string>('IDEMPOTENCY_CLEANUP_INTERVAL_MS') || '3600000');

    await this.maintenanceQueue.add(
      CLEANUP_JOB_NAME,
      {},
      {
        jobId: CLEANUP_REPEAT_JOB_ID,
        repeat: {
          every: everyMs,
        },
        attempts: 1,
      },
    );
  }

  async process(job: Job): Promise<void> {
    if (job.name !== CLEANUP_JOB_NAME) {
      return;
    }

    const batchSize = Number(this.configService.get<string>('IDEMPOTENCY_CLEANUP_BATCH_SIZE') || '500');
    const deleted = await this.idempotencyService.cleanupExpired(batchSize);

    this.logger.info('Idempotency cleanup completed', {
      service: 'idempotency-cleanup',
      batchSize,
      deleted,
    });
  }
}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyCleanupProcessor } from './idempotency-cleanup.processor';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'maintenance',
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    }),
  ],
  providers: [IdempotencyService, IdempotencyCleanupProcessor],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}

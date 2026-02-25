import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance/governance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessMetricsController } from './business-metrics.controller';
import { BusinessMetricsCacheService } from './business-metrics-cache.service';
import { BusinessMetricsService } from './business-metrics.service';

@Module({
  imports: [
    PrismaModule,
    GovernanceModule,
    BullModule.registerQueue({
      name: 'workflows',
    }),
  ],
  controllers: [BusinessMetricsController],
  providers: [BusinessMetricsService, BusinessMetricsCacheService],
  exports: [BusinessMetricsService],
})
export class BusinessMetricsModule {}

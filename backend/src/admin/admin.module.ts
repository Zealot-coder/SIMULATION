import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthModule } from '../health/health.module';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    GovernanceModule,
    BullModule.registerQueue(
      { name: 'workflows' },
      { name: 'events' },
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}



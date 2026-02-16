import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
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



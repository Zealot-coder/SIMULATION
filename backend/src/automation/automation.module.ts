import { Module } from '@nestjs/common';
// import { BullModule } from '@nestjs/bullmq'; // Disabled: Using Supabase instead
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { AutomationProcessor } from './automation.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    PrismaModule,
    WorkflowModule,
    // BullModule.registerQueue({
    //   name: 'automation',
    // }),
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationProcessor],
  exports: [AutomationService],
})
export class AutomationModule {}



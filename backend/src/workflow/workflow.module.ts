import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowController } from './workflow.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { CommunicationModule } from '../communication/communication.module';
import { WorkflowProcessor } from './workflow.processor';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    CommunicationModule,
    BullModule.registerQueue({
      name: 'workflow',
    }),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowExecutionService, WorkflowProcessor],
  exports: [WorkflowService, WorkflowExecutionService],
})
export class WorkflowModule {}


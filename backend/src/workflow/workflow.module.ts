import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowController } from './workflow.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { CommunicationModule } from '../communication/communication.module';
import { WorkflowProcessor } from './workflow.processor';
import { AuditModule } from '../audit/audit.module';
import { WorkflowDlqService } from './workflow-dlq.service';
import { WorkflowDlqController } from './workflow-dlq.controller';
import { WorkflowStepDedupService } from './workflow-step-dedup.service';
import { GovernanceModule } from '../governance/governance.module';
import { BusinessMetricsModule } from '../business-metrics/business-metrics.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    CommunicationModule,
    AuditModule,
    GovernanceModule,
    BusinessMetricsModule,
    BullModule.registerQueue({
      name: 'workflows',
    }),
  ],
  controllers: [WorkflowController, WorkflowDlqController],
  providers: [
    WorkflowService,
    WorkflowExecutionService,
    WorkflowProcessor,
    WorkflowDlqService,
    WorkflowStepDedupService,
  ],
  exports: [WorkflowService, WorkflowExecutionService, WorkflowDlqService],
})
export class WorkflowModule {}


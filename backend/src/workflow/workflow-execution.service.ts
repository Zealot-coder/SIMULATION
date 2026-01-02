import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStatus, WorkflowStepStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { AiService } from '../ai/ai.service';
import { CommunicationService } from '../communication/communication.service';

@Injectable()
export class WorkflowExecutionService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('workflow') private workflowQueue: Queue,
    private aiService: AiService,
    private communicationService: CommunicationService,
  ) {}

  async createExecution(
    workflowId: string,
    organizationId: string,
    eventId: string | null,
    input: any,
  ) {
    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId,
        organizationId,
        eventId,
        status: WorkflowStatus.PENDING,
        input,
      },
      include: {
        workflow: true,
      },
    });

    // Queue workflow execution
    await this.workflowQueue.add('execute-workflow', {
      executionId: execution.id,
    });

    return execution;
  }

  async executeWorkflow(executionId: string) {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
        steps: {
          orderBy: { stepIndex: 'asc' },
        },
      },
    });

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== WorkflowStatus.PENDING) {
      return; // Already processing or completed
    }

    // Update status to running
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: WorkflowStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    const steps = execution.workflow.steps as any[];
    let currentOutput = execution.input;

    try {
      // Execute each step
      for (let i = 0; i < steps.length; i++) {
        const stepDef = steps[i];
        
        // Create step record
        const step = await this.prisma.workflowStep.create({
          data: {
            executionId,
            stepIndex: i,
            stepType: stepDef.stepType,
            config: stepDef.config,
            input: currentOutput as any,
            status: WorkflowStepStatus.RUNNING,
            startedAt: new Date(),
          },
        });

        try {
          // Execute step based on type
          const stepOutput = await this.executeStep(
            stepDef,
            currentOutput,
            execution.organizationId,
          );

          // Update step with output
          await this.prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              status: WorkflowStepStatus.COMPLETED,
              output: stepOutput,
              completedAt: new Date(),
            },
          });

          currentOutput = stepOutput;
        } catch (error: any) {
          // Mark step as failed
          await this.prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              status: WorkflowStepStatus.FAILED,
              error: error.message,
              completedAt: new Date(),
            },
          });

          throw error;
        }
      }

      // Mark execution as completed
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: WorkflowStatus.COMPLETED,
          output: currentOutput as any,
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      // Mark execution as failed
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: WorkflowStatus.FAILED,
          error: error.message,
          completedAt: new Date(),
        },
      });
    }
  }

  private async executeStep(
    stepDef: any,
    input: any,
    organizationId: string,
  ): Promise<any> {
    switch (stepDef.stepType) {
      case 'ai_process':
        return this.executeAIStep(stepDef, input, organizationId);
      case 'send_message':
        return this.executeMessageStep(stepDef, input, organizationId);
      case 'update_record':
        return this.executeUpdateStep(stepDef, input);
      case 'wait':
        return this.executeWaitStep(stepDef, input);
      case 'approval':
        return this.executeApprovalStep(stepDef, input, organizationId);
      default:
        throw new Error(`Unknown step type: ${stepDef.stepType}`);
    }
  }

  private async executeAIStep(
    stepDef: any,
    input: any,
    organizationId: string,
  ): Promise<any> {
    const prompt = this.interpolateTemplate(stepDef.config.prompt, input);
    const aiRequest = await this.aiService.processRequest({
      type: stepDef.config.aiType || 'TEXT_UNDERSTANDING',
      prompt,
      context: input,
      organizationId,
    });

    return {
      ...input,
      aiResult: aiRequest.response,
      aiConfidence: aiRequest.confidence,
    };
  }

  private async executeMessageStep(
    stepDef: any,
    input: any,
    organizationId: string,
  ): Promise<any> {
    const to = this.interpolateTemplate(stepDef.config.to, input);
    const content = this.interpolateTemplate(stepDef.config.content, input);

    await this.communicationService.sendMessage({
      organizationId,
      channel: stepDef.config.channel,
      to,
      content,
      language: stepDef.config.language || 'en',
    });

    return input;
  }

  private async executeUpdateStep(stepDef: any, input: any): Promise<any> {
    // Simple data transformation
    const updates = stepDef.config.updates || {};
    return { ...input, ...updates };
  }

  private async executeWaitStep(stepDef: any, input: any): Promise<any> {
    const duration = stepDef.config.duration || 0; // milliseconds
    await new Promise((resolve) => setTimeout(resolve, duration));
    return input;
  }

  private async executeApprovalStep(
    stepDef: any,
    input: any,
    organizationId: string,
  ): Promise<any> {
    // Mark execution as waiting for approval
    // In a real implementation, this would pause the workflow
    // and notify the approver
    return {
      ...input,
      requiresApproval: true,
      approvalMessage: stepDef.config.message,
    };
  }

  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}


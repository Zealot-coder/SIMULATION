import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationJobStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { WorkflowExecutionService } from '../workflow/workflow-execution.service';

@Injectable()
export class AutomationService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('automation') private automationQueue: Queue,
    private workflowExecutionService: WorkflowExecutionService,
  ) {}

  async createJob(
    organizationId: string,
    userId: string,
    data: {
      taskDescription: string;
      inputData: any;
      expectedOutput?: string;
      workflowId?: string;
    },
  ) {
    // Create automation job
    const job = await this.prisma.automationJob.create({
      data: {
        organizationId,
        userId,
        workflowId: data.workflowId,
        taskDescription: data.taskDescription,
        inputData: data.inputData,
        expectedOutput: data.expectedOutput,
        status: AutomationJobStatus.PENDING,
      },
    });

    // Queue job for processing
    await this.automationQueue.add('process-automation-job', {
      jobId: job.id,
    });

    return job;
  }

  async getJobStatus(jobId: string, userId: string) {
    const job = await this.prisma.automationJob.findFirst({
      where: {
        id: jobId,
        userId, // Ensure user can only see their own jobs
      },
      include: {
        executionLogs: {
          orderBy: { timestamp: 'asc' },
        },
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    return job;
  }

  async getJobResult(jobId: string, userId: string) {
    const job = await this.getJobStatus(jobId, userId);
    
    if (job.status !== AutomationJobStatus.COMPLETED) {
      throw new Error('Job not completed yet');
    }

    return {
      result: job.result,
      executionTime: job.executionTime,
      logs: job.executionLogs,
    };
  }

  async getJobHistory(organizationId: string, userId: string, limit = 50) {
    return this.prisma.automationJob.findMany({
      where: {
        organizationId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async processJob(jobId: string) {
    const job = await this.prisma.automationJob.findUnique({
      where: { id: jobId },
      include: {
        workflow: true,
        organization: true,
      },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== AutomationJobStatus.PENDING) {
      return; // Already processing or completed
    }

    // Update status to running
    const startTime = Date.now();
    await this.prisma.automationJob.update({
      where: { id: jobId },
      data: {
        status: AutomationJobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    // Log start
    await this.prisma.executionLog.create({
      data: {
        jobId,
        step: 'Job Started',
        status: 'info',
        message: `Processing: ${job.taskDescription}`,
      },
    });

    try {
      let result: any;

      if (job.workflowId && job.workflow) {
        // Use existing workflow
        result = await this.workflowExecutionService.createExecution(
          job.workflowId,
          job.organizationId,
          null,
          job.inputData,
        );
      } else {
        // Simple automation: process input and return result
        result = await this.processSimpleAutomation(job);
      }

      const executionTime = Date.now() - startTime;

      // Update job as completed
      await this.prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: AutomationJobStatus.COMPLETED,
          result,
          completedAt: new Date(),
          executionTime,
        },
      });

      // Log completion
      await this.prisma.executionLog.create({
        data: {
          jobId,
          step: 'Job Completed',
          status: 'success',
          message: 'Automation completed successfully',
          data: { executionTime },
        },
      });
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Update job as failed
      await this.prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: AutomationJobStatus.FAILED,
          error: error.message,
          completedAt: new Date(),
          executionTime,
        },
      });

      // Log error
      await this.prisma.executionLog.create({
        data: {
          jobId,
          step: 'Job Failed',
          status: 'error',
          message: error.message,
        },
      });

      throw error;
    }
  }

  private async processSimpleAutomation(job: any): Promise<any> {
    // Simple automation logic
    // In a real system, this would use AI to understand the task
    // and execute it automatically

    await this.prisma.executionLog.create({
      data: {
        jobId: job.id,
        step: 'Processing',
        status: 'info',
        message: 'Analyzing task description and input data',
      },
    });

    // Mock processing - in real system, this would use AI
    return {
      processed: true,
      input: job.inputData,
      message: `Task "${job.taskDescription}" has been processed`,
      timestamp: new Date().toISOString(),
    };
  }
}


import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { WorkflowExecutionService } from './workflow-execution.service';
import { EventType, WorkflowStatus } from '@prisma/client';

@Injectable()
export class WorkflowService {
  constructor(
    private prisma: PrismaService,
    private executionService: WorkflowExecutionService,
  ) {}

  async create(organizationId: string, dto: CreateWorkflowDto) {
    const workflow = await this.prisma.workflow.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        triggerEventType: dto.triggerEventType,
        triggerCondition: dto.triggerCondition,
        steps: dto.steps as any,
        isActive: dto.isActive ?? true,
      },
    });

    return workflow;
  }

  async findAll(organizationId: string) {
    return this.prisma.workflow.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async update(id: string, organizationId: string, dto: Partial<CreateWorkflowDto>) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        triggerEventType: dto.triggerEventType,
        triggerCondition: dto.triggerCondition,
        steps: dto.steps as any,
        isActive: dto.isActive,
      },
    });
  }

  async triggerWorkflowsForEvent(organizationId: string, event: any) {
    // Find active workflows that match this event type
    const workflows = await this.prisma.workflow.findMany({
      where: {
        organizationId,
        isActive: true,
        triggerEventType: event.type,
      },
    });

    // Check trigger conditions
    const matchingWorkflows = workflows.filter((workflow) => {
      if (!workflow.triggerCondition) {
        return true; // No condition, always trigger
      }

      return this.evaluateCondition(
        workflow.triggerCondition as any,
        event.payload,
      );
    });

    // Execute matching workflows
    for (const workflow of matchingWorkflows) {
      await this.executionService.createExecution(
        workflow.id,
        organizationId,
        event.id,
        event.payload,
      );
    }

    return matchingWorkflows.length;
  }

  private evaluateCondition(
    condition: { field: string; operator: string; value: any },
    payload: any,
  ): boolean {
    const fieldValue = this.getNestedValue(payload, condition.field);

    switch (condition.operator) {
      case '==':
        return fieldValue === condition.value;
      case '!=':
        return fieldValue !== condition.value;
      case '>':
        return fieldValue > condition.value;
      case '>=':
        return fieldValue >= condition.value;
      case '<':
        return fieldValue < condition.value;
      case '<=':
        return fieldValue <= condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}


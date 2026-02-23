import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { WorkflowExecutionService } from './workflow-execution.service';
import { CorrelationContextService } from '../common/context/correlation-context.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executionService: WorkflowExecutionService,
    private readonly correlationContext: CorrelationContextService,
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

  async findOne(id: string, organizationId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id,
        organizationId,
      },
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

  async triggerWorkflowsForEvent(
    organizationId: string,
    event: { id: string; type: EventType; payload: unknown },
    correlationId?: string,
  ) {
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
    const resolvedCorrelationId = correlationId || this.correlationContext.getCorrelationId();
    for (const workflow of matchingWorkflows) {
      await this.executionService.createExecution(
        workflow.id,
        organizationId,
        event.id,
        event.payload,
        resolvedCorrelationId,
      );
    }

    return matchingWorkflows.length;
  }

  private evaluateCondition(
    condition: { field: string; operator: string; value: unknown },
    payload: unknown,
  ): boolean {
    const fieldValue = this.getNestedValue(payload, condition.field);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case '==':
        return fieldValue === expectedValue;
      case '!=':
        return fieldValue !== expectedValue;
      case '>':
        return this.asNumber(fieldValue) > this.asNumber(expectedValue);
      case '>=':
        return this.asNumber(fieldValue) >= this.asNumber(expectedValue);
      case '<':
        return this.asNumber(fieldValue) < this.asNumber(expectedValue);
      case '<=':
        return this.asNumber(fieldValue) <= this.asNumber(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      default:
        return false;
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    return path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      return (current as Record<string, unknown>)[key];
    }, obj);
  }

  private asNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return Number.NaN;
  }
}



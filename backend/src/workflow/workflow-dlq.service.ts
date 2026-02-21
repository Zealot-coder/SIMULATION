import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DlqListQueryDto } from './dto/dlq-list-query.dto';
import { DlqReplayDto, DlqReplayMode } from './dto/dlq-replay.dto';
import { DlqResolutionDto } from './dto/dlq-resolution.dto';
import { CorrelationContextService } from '../common/context/correlation-context.service';
import { WorkflowJobPayload } from './workflow-job-payload';
import { AppLoggerService } from '../common/logger/app-logger.service';

interface AuthUser {
  id: string;
  role: UserRole | string;
}

type NormalizedDlqRole = UserRole;

@Injectable()
export class WorkflowDlqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly correlationContext: CorrelationContextService,
    private readonly logger: AppLoggerService,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
  ) {}

  async list(user: AuthUser, query: DlqListQueryDto) {
    const take = query.limit ?? 25;
    const scopedOrganizationId = await this.resolveScopedOrganizationId(user, query.organizationId);

    const where: Prisma.WorkflowStepDlqItemWhereInput = {
      ...(scopedOrganizationId && { organizationId: scopedOrganizationId }),
      ...(query.stepType && { stepType: query.stepType }),
      ...(query.errorCategory && { errorCategory: query.errorCategory }),
      ...(query.status && { status: query.status as any }),
      ...this.timeRangeWhere(query.from, query.to),
      ...(!(scopedOrganizationId) ? await this.allowedOrganizationsWhere(user) : {}),
    };

    const items = await this.prisma.workflowStepDlqItem.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(query.cursor
        ? {
            skip: 1,
            cursor: {
              id: query.cursor,
            },
          }
        : {}),
      include: {
        workflowExecution: {
          select: {
            id: true,
            workflowId: true,
            status: true,
            createdAt: true,
          },
        },
        workflowStep: {
          select: {
            id: true,
            stepIndex: true,
            status: true,
            attemptCount: true,
            maxRetries: true,
          },
        },
      },
    });

    return {
      items,
      nextCursor: items.length === take ? items[items.length - 1].id : null,
    };
  }

  async getById(user: AuthUser, dlqId: string) {
    const dlqItem = await this.prisma.workflowStepDlqItem.findUnique({
      where: { id: dlqId },
      include: {
        workflowExecution: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        workflowStep: true,
      },
    });

    if (!dlqItem) {
      throw new NotFoundException('DLQ item not found');
    }

    await this.assertCanAccessOrganization(user, dlqItem.organizationId);
    return dlqItem;
  }

  async replay(user: AuthUser, dlqId: string, dto: DlqReplayDto) {
    await this.assertCanReplay(user);

    const dlqItem = await this.getById(user, dlqId);
    const fromStepIndex = dto.mode === DlqReplayMode.FROM_STEP
      ? (dto.fromStepIndex ?? dlqItem.workflowStep.stepIndex)
      : dlqItem.workflowStep.stepIndex;

    const correlationId = this.correlationContext.getCorrelationId() || `dlq_${dlqItem.id}`;

    await this.prisma.workflowStepDlqItem.update({
      where: { id: dlqItem.id },
      data: {
        status: 'REPLAYING',
        replayCount: {
          increment: 1,
        },
        lastReplayAt: new Date(),
        lastReplayBy: user.id,
        replayOverride: dto.overrideRetryPolicy as never,
      },
    });

    const payload: WorkflowJobPayload = {
      executionId: dlqItem.workflowExecutionId,
      correlationId,
      replay: {
        mode: dto.mode,
        fromStepIndex,
        dlqItemId: dlqItem.id,
        overrideRetryPolicy: dto.overrideRetryPolicy,
        requestedByUserId: user.id,
      },
    };

    await this.workflowQueue.add('execute-workflow', payload, {
      attempts: 1,
      jobId: `wf:${dlqItem.workflowExecutionId}:replay:${dlqItem.id}:${Date.now()}`,
    });

    await this.auditService.log(
      AuditAction.EXECUTE,
      'WorkflowStepDlqReplay',
      dlqItem.id,
      'Replay requested for DLQ item',
      {
        organizationId: dlqItem.organizationId,
        userId: user.id,
        metadata: {
          mode: dto.mode,
          fromStepIndex,
          overrideRetryPolicy: dto.overrideRetryPolicy,
          correlationId,
        },
      },
    );

    this.logger.info('DLQ replay queued', {
      service: 'workflow-dlq',
      dlqItemId: dlqItem.id,
      workflowExecutionId: dlqItem.workflowExecutionId,
      mode: dto.mode,
      fromStepIndex,
      correlationId,
    });

    return {
      replayQueued: true,
      correlationId,
      dlqItemId: dlqItem.id,
      workflowExecutionId: dlqItem.workflowExecutionId,
    };
  }

  async resolve(user: AuthUser, dlqId: string, dto: DlqResolutionDto) {
    await this.assertCanReplay(user);
    const dlqItem = await this.getById(user, dlqId);

    const updated = await this.prisma.workflowStepDlqItem.update({
      where: { id: dlqId },
      data: {
        status: 'RESOLVED',
        resolvedReason: dto.reason,
        resolvedBy: user.id,
        resolvedAt: new Date(),
      },
    });

    await this.auditService.log(
      AuditAction.UPDATE,
      'WorkflowStepDlqItem',
      dlqItem.id,
      'DLQ item marked as resolved',
      {
        organizationId: dlqItem.organizationId,
        userId: user.id,
        metadata: {
          reason: dto.reason,
          correlationId: this.correlationContext.getCorrelationId(),
        },
      },
    );

    return updated;
  }

  async ignore(user: AuthUser, dlqId: string, dto: DlqResolutionDto) {
    await this.assertCanReplay(user);
    const dlqItem = await this.getById(user, dlqId);

    const updated = await this.prisma.workflowStepDlqItem.update({
      where: { id: dlqId },
      data: {
        status: 'IGNORED',
        resolvedReason: dto.reason,
        resolvedBy: user.id,
        resolvedAt: new Date(),
      },
    });

    await this.auditService.log(
      AuditAction.UPDATE,
      'WorkflowStepDlqItem',
      dlqItem.id,
      'DLQ item marked as ignored',
      {
        organizationId: dlqItem.organizationId,
        userId: user.id,
        metadata: {
          reason: dto.reason,
          correlationId: this.correlationContext.getCorrelationId(),
        },
      },
    );

    return updated;
  }

  private async resolveScopedOrganizationId(user: AuthUser, requestedOrgId?: string): Promise<string | undefined> {
    if (!requestedOrgId) {
      return undefined;
    }

    await this.assertCanAccessOrganization(user, requestedOrgId);
    return requestedOrgId;
  }

  private async assertCanAccessOrganization(user: AuthUser, organizationId: string): Promise<void> {
    const role = this.normalizeRole(user.role);

    if (role === UserRole.OWNER) {
      return;
    }

    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only OWNER and ADMIN can access DLQ');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId,
        isActive: true,
        role: {
          in: [UserRole.ADMIN, UserRole.OWNER],
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Insufficient organization access for DLQ operation');
    }
  }

  private async assertCanReplay(user: AuthUser): Promise<void> {
    const role = this.normalizeRole(user.role);
    if (role === UserRole.OWNER || role === UserRole.ADMIN) {
      return;
    }

    throw new ForbiddenException('Only OWNER and ADMIN can replay DLQ items');
  }

  private async allowedOrganizationsWhere(user: AuthUser): Promise<Prisma.WorkflowStepDlqItemWhereInput> {
    const role = this.normalizeRole(user.role);

    if (role === UserRole.OWNER) {
      return {};
    }

    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only OWNER and ADMIN can access DLQ');
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        role: {
          in: [UserRole.ADMIN, UserRole.OWNER],
        },
      },
      select: {
        organizationId: true,
      },
    });

    const orgIds = memberships.map((membership) => membership.organizationId);
    if (orgIds.length === 0) {
      throw new ForbiddenException('No organization access for DLQ');
    }

    return {
      organizationId: {
        in: orgIds,
      },
    };
  }

  private timeRangeWhere(from?: string, to?: string): Prisma.WorkflowStepDlqItemWhereInput {
    if (!from && !to) {
      return {};
    }

    const range: Prisma.DateTimeFilter = {};

    if (from) {
      const date = new Date(from);
      if (!Number.isNaN(date.getTime())) {
        range.gte = date;
      }
    }

    if (to) {
      const date = new Date(to);
      if (!Number.isNaN(date.getTime())) {
        range.lte = date;
      }
    }

    if (Object.keys(range).length === 0) {
      return {};
    }

    return {
      createdAt: range,
    };
  }

  private normalizeRole(role: UserRole | string): NormalizedDlqRole {
    const normalized = String(role || '')
      .trim()
      .toUpperCase();

    if (normalized === 'OWNER' || normalized === 'SUPER_ADMIN') {
      return UserRole.OWNER;
    }

    if (normalized === 'ADMIN' || normalized === 'ORG_ADMIN') {
      return UserRole.ADMIN;
    }

    if (normalized === 'STAFF' || normalized === 'OPERATOR') {
      return UserRole.STAFF;
    }

    return UserRole.VIEWER;
  }
}

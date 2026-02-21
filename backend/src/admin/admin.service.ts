import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, WorkflowStatus } from '@prisma/client';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { HealthService } from '../health/health.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly healthService: HealthService,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
    @InjectQueue('events') private readonly eventQueue: Queue,
  ) {}

  async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Admin access required');
    }

    return user;
  }

  async getSystemMetrics() {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [executions, eventCount, eventsByType, workflowQueueCounts, eventQueueCounts, health] =
      await Promise.all([
        this.prisma.workflowExecution.findMany({
          where: { createdAt: { gte: windowStart } },
          select: {
            status: true,
            startedAt: true,
            completedAt: true,
          },
        }),
        this.prisma.event.count({
          where: { createdAt: { gte: windowStart } },
        }),
        this.prisma.event.groupBy({
          by: ['type'],
          where: { createdAt: { gte: windowStart } },
          _count: {
            _all: true,
          },
        }),
        this.workflowQueue.getJobCounts('waiting', 'active', 'failed'),
        this.eventQueue.getJobCounts('waiting', 'active', 'failed'),
        this.healthService.getDetailedHealthStatus(),
      ]);

    const totalRuns = executions.length;
    const successfulRuns = executions.filter((execution) => execution.status === WorkflowStatus.SUCCESS).length;
    const completedWithDuration = executions.filter(
      (execution) => execution.startedAt && execution.completedAt,
    );

    const averageDurationMs =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, execution) => {
            return sum + (execution.completedAt!.getTime() - execution.startedAt!.getTime());
          }, 0) / completedWithDuration.length
        : 0;

    const queue = {
      waiting: (workflowQueueCounts.waiting || 0) + (eventQueueCounts.waiting || 0),
      active: (workflowQueueCounts.active || 0) + (eventQueueCounts.active || 0),
      failed: (workflowQueueCounts.failed || 0) + (eventQueueCounts.failed || 0),
      workflows: {
        waiting: workflowQueueCounts.waiting || 0,
        active: workflowQueueCounts.active || 0,
        failed: workflowQueueCounts.failed || 0,
      },
      events: {
        waiting: eventQueueCounts.waiting || 0,
        active: eventQueueCounts.active || 0,
        failed: eventQueueCounts.failed || 0,
      },
    };

    this.logger.info('Admin system metrics requested', {
      service: 'admin',
      totalRuns,
      eventCount,
      queueWaiting: queue.waiting,
    });

    return {
      workflows: {
        totalRuns,
        successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 100,
        avgDuration: averageDurationMs / 1000,
      },
      events: {
        totalIngested: eventCount,
        byType: eventsByType.map((entry) => ({
          type: entry.type,
          count: entry._count._all,
        })),
      },
      queue,
      health,
    };
  }

  async getRecentErrors(limit = 50) {
    return this.prisma.workflowExecution.findMany({
      where: { status: WorkflowStatus.FAILED },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(limit, 200)),
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getRecentLogs(correlationId?: string, organizationId?: string, limit = 100) {
    const take = Math.max(1, Math.min(limit, 250));
    return this.prisma.auditLog.findMany({
      where: {
        ...(correlationId && {
          metadata: {
            path: ['correlationId'],
            equals: correlationId,
          },
        }),
        ...(organizationId && { organizationId }),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // User Management
  async getUserMetrics(months: number = 6) {
    // Protect the DB from accidentally huge reads (e.g. months=100000).
    const normalizedMonths = Number.isFinite(months) ? Math.trunc(months) : 6;
    const windowMonths = Math.min(Math.max(normalizedMonths, 1), 36);

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (windowMonths - 1), 1));

    const monthKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    // Pre-fill months so the client always gets a contiguous timeline.
    const monthsTimeline = Array.from({ length: windowMonths }, (_, i) => {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      return monthKey(d);
    });

    const [totalUsers, activeUsers, usersByRole, createdAts, lastLogins] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { lastLogin: { gte: start } },
        select: { lastLogin: true },
      }),
    ]);

    const byRole: Record<UserRole, number> = {
      OWNER: 0,
      ADMIN: 0,
      STAFF: 0,
      VIEWER: 0,
    };
    for (const row of usersByRole) {
      byRole[row.role] = row._count._all;
    }

    const newUsersByMonth = Object.fromEntries(monthsTimeline.map((m) => [m, 0])) as Record<string, number>;
    for (const row of createdAts) {
      const key = monthKey(row.createdAt);
      if (key in newUsersByMonth) newUsersByMonth[key] += 1;
    }

    const loginsByMonth = Object.fromEntries(monthsTimeline.map((m) => [m, 0])) as Record<string, number>;
    for (const row of lastLogins) {
      if (!row.lastLogin) continue;
      const key = monthKey(row.lastLogin);
      if (key in loginsByMonth) loginsByMonth[key] += 1;
    }

    return {
      range: {
        months: windowMonths,
        start: start.toISOString(),
        end: now.toISOString(),
      },
      totals: {
        users: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole,
      },
      newUsersByMonth: monthsTimeline.map((m) => ({ month: m, count: newUsersByMonth[m] })),
      loginsByMonth: monthsTimeline.map((m) => ({ month: m, count: loginsByMonth[m] })),
    };
  }

  async getUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              organizationMemberships: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async disableUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async enableUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  // Automation Monitoring
  async getAutomations() {
    const [workflows, executions, jobs] = await Promise.all([
      this.prisma.workflow.count(),
      this.prisma.workflowExecution.count(),
      this.prisma.automationJob.count(),
    ]);

    return {
      totalWorkflows: workflows,
      totalExecutions: executions,
      totalJobs: jobs,
      activeWorkflows: await this.prisma.workflow.count({
        where: { isActive: true },
      }),
      runningExecutions: await this.prisma.workflowExecution.count({
        where: { status: 'RUNNING' },
      }),
      pendingJobs: await this.prisma.automationJob.count({
        where: { status: 'PENDING' },
      }),
    };
  }

  // AI Usage Metrics
  async getAIUsage(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = startDate;
      if (endDate) where.requestedAt.lte = endDate;
    }

    const [requests, completed, failed] = await Promise.all([
      this.prisma.aIRequest.findMany({
        where,
        select: {
          id: true,
          type: true,
          status: true,
          tokensUsed: true,
          cost: true,
          requestedAt: true,
        },
      }),
      this.prisma.aIRequest.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      this.prisma.aIRequest.count({
        where: { ...where, status: 'FAILED' },
      }),
    ]);

    const totalCost = requests.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalTokens = requests.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    return {
      totalRequests: requests.length,
      completed,
      failed,
      totalCost,
      totalTokens,
      averageCost: requests.length > 0 ? totalCost / requests.length : 0,
      requestsByType: this.groupBy(requests, 'type'),
    };
  }

  // Analytics
  async getAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalUsers,
      activeUsers,
      totalOrganizations,
      totalWorkflows,
      totalEvents,
      totalJobs,
      executionStats,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.organization.count({ where }),
      this.prisma.workflow.count({ where }),
      this.prisma.event.count({ where }),
      this.prisma.automationJob.count({ where }),
      this.getExecutionStats(where),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      organizations: {
        total: totalOrganizations,
      },
      automations: {
        workflows: totalWorkflows,
        events: totalEvents,
        jobs: totalJobs,
      },
      executions: executionStats,
    };
  }

  private async getExecutionStats(where: any) {
    const executions = await this.prisma.workflowExecution.findMany({
      where,
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });

    const byStatus = this.groupBy(executions, 'status');
    const completed = executions.filter((e) => e.status === 'SUCCESS' && e.startedAt && e.completedAt);
    const avgExecutionTime = completed.length > 0
      ? completed.reduce((sum, e) => {
          const time = e.completedAt!.getTime() - e.startedAt!.getTime();
          return sum + time;
        }, 0) / completed.length
      : 0;

    return {
      byStatus,
      total: executions.length,
      averageExecutionTime: avgExecutionTime,
      successRate: executions.length > 0
        ? (byStatus.SUCCESS?.length || 0) / executions.length
        : 0,
    };
  }

  // Logs
  async getLogs(filters?: {
    entityType?: string;
    action?: string;
    userId?: string;
    limit?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.action && { action: filters.action as any }),
        ...(filters?.userId && { userId: filters.userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Export Reports
  async exportAnalytics(format: 'csv' | 'json' = 'json') {
    const analytics = await this.getAnalytics();
    const aiUsage = await this.getAIUsage();
    const automations = await this.getAutomations();

    const data = {
      generatedAt: new Date().toISOString(),
      analytics,
      aiUsage,
      automations,
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const group = String(item[key] || 'unknown');
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion (can be enhanced)
    const lines: string[] = [];
    lines.push('Metric,Value');
    lines.push(`Total Users,${data.analytics.users.total}`);
    lines.push(`Active Users,${data.analytics.users.active}`);
    lines.push(`Total Organizations,${data.analytics.organizations.total}`);
    lines.push(`Total Workflows,${data.analytics.automations.workflows}`);
    lines.push(`Total AI Requests,${data.aiUsage.totalRequests}`);
    lines.push(`Total AI Cost,${data.aiUsage.totalCost}`);
    return lines.join('\n');
  }
}



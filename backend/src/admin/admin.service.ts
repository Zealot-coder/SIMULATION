import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Admin access required');
    }

    return user;
  }

  // User Management
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
    const completed = executions.filter((e) => e.status === 'COMPLETED' && e.startedAt && e.completedAt);
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
        ? (byStatus.COMPLETED?.length || 0) / executions.length
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


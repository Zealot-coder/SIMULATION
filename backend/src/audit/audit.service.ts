import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: AuditAction,
    entityType: string,
    entityId: string | null,
    description: string,
    options?: {
      userId?: string;
      organizationId?: string;
      metadata?: any;
      changes?: any;
    },
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        description,
        userId: options?.userId,
        organizationId: options?.organizationId,
        metadata: options?.metadata,
        changes: options?.changes,
      },
    });
  }

  async getLogs(
    organizationId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      action?: AuditAction;
      limit?: number;
    },
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.entityId && { entityId: filters.entityId }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.action && { action: filters.action }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
      // Note: User relation not included in AuditLog model
      // User info available via userId field
    });
  }

  async createFeedback(
    organizationId: string,
    userId: string,
    entityType: string,
    entityId: string,
    feedbackType: string,
    options?: {
      originalValue?: any;
      correctedValue?: any;
      comment?: string;
    },
  ) {
    return this.prisma.humanFeedback.create({
      data: {
        organizationId,
        userId,
        entityType,
        entityId,
        feedbackType,
        originalValue: options?.originalValue,
        correctedValue: options?.correctedValue,
        comment: options?.comment,
      },
    });
  }
}


import { Injectable, NotFoundException } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../event/event.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { PaymentIdempotencyService } from './payment-idempotency.service';
import { SupportedWebhookProvider, extractWebhookDedupKey } from './webhook-dedup.util';
import { CommunicationService } from '../communication/communication.service';

@Injectable()
export class WebhookService {
  private readonly ttlHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    private readonly configService: ConfigService,
    private readonly metrics: WorkflowMetrics,
    private readonly logger: AppLoggerService,
    private readonly paymentIdempotencyService: PaymentIdempotencyService,
    private readonly communicationService: CommunicationService,
  ) {
    this.ttlHours = Number(this.configService.get<string>('WEBHOOK_DEDUP_TTL_HOURS') || '24');
  }

  async ingest(params: {
    provider: SupportedWebhookProvider;
    organizationId: string;
    payload: unknown;
    headers: Record<string, string | undefined>;
    correlationId?: string;
  }) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: params.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const dedupKey = extractWebhookDedupKey({
      provider: params.provider,
      payload: params.payload,
      headers: params.headers,
    });

    const inserted = await this.tryInsertWebhookDedup({
      organizationId: params.organizationId,
      provider: params.provider,
      dedupKey,
    });

    if (!inserted) {
      this.metrics.incrementWebhookDuplicate(params.provider, params.organizationId);
      this.logger.info('Duplicate webhook ignored', {
        service: 'webhook',
        organizationId: params.organizationId,
        provider: params.provider,
        dedupKey,
        correlationId: params.correlationId,
      });
      return {
        duplicate: true,
        dedupKey,
      };
    }

    const paymentGuard = await this.paymentIdempotencyService.guardWebhookPayment({
      organizationId: params.organizationId,
      provider: params.provider,
      payload: params.payload,
    });

    if (paymentGuard.duplicate) {
      return {
        duplicate: true,
        dedupKey,
        reason: paymentGuard.reason,
      };
    }

    await this.communicationService.applyDeliveryStatusFromWebhook({
      organizationId: params.organizationId,
      provider: params.provider,
      payload: params.payload,
    });

    const event = await this.eventService.create(params.organizationId, {
      type: EventType.CUSTOM,
      name: `${params.provider.toUpperCase()}_WEBHOOK`,
      payload: params.payload as Record<string, unknown>,
      source: params.provider,
      metadata: {
        dedupKey,
      },
    });

    return {
      duplicate: false,
      dedupKey,
      eventId: event.id,
    };
  }

  private async tryInsertWebhookDedup(params: {
    organizationId: string;
    provider: string;
    dedupKey: string;
  }): Promise<boolean> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.ttlHours);

    try {
      await this.prisma.webhookDedup.create({
        data: {
          organizationId: params.organizationId,
          provider: params.provider,
          dedupKey: params.dedupKey,
          expiresAt,
        },
      });
      return true;
    } catch (error) {
      const prismaError = error as { code?: string } | undefined;
      if (prismaError?.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }
}

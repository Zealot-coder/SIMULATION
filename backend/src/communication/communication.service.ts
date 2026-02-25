import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  CommunicationChannel,
  CommunicationStatus,
} from '@prisma/client';
import { GovernanceService } from '../governance/governance.service';
import { BusinessMetricsService } from '../business-metrics/business-metrics.service';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private governanceService: GovernanceService,
    private businessMetricsService: BusinessMetricsService,
  ) {}

  async sendMessage(dto: SendMessageDto & { organizationId: string }) {
    let communication = dto.idempotencyKey
      ? await this.prisma.communication.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        })
      : null;

    if (
      communication &&
      (communication.status === CommunicationStatus.SENT ||
        communication.status === CommunicationStatus.DELIVERED ||
        communication.status === CommunicationStatus.READ)
    ) {
      return communication;
    }

    if (!communication) {
      await this.governanceService.consumeDailyMessageQuota(dto.organizationId);
      communication = await this.prisma.communication.create({
        data: {
          organizationId: dto.organizationId,
          channel: dto.channel,
          to: dto.to,
          toName: dto.toName,
          content: dto.content,
          language: dto.language || 'en',
          templateId: dto.templateId,
          status: CommunicationStatus.PENDING,
          idempotencyKey: dto.idempotencyKey,
        },
      });
    }

    try {
      // Send via appropriate channel
      const result = await this.sendViaChannel(dto);

      // Update with delivery info
      const updated = await this.prisma.communication.update({
        where: { id: communication.id },
        data: {
          status: CommunicationStatus.SENT,
          externalId: result.externalId,
          deliveredAt: result.deliveredAt,
        },
      });

      await this.businessMetricsService.recordMessageSent({
        organizationId: dto.organizationId,
        sentAt: updated.updatedAt,
        delivered:
          updated.status === CommunicationStatus.DELIVERED ||
          updated.status === CommunicationStatus.READ ||
          Boolean(updated.deliveredAt),
      });

      return updated;
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);

      // Update with error
      await this.prisma.communication.update({
        where: { id: communication.id },
        data: {
          status: CommunicationStatus.FAILED,
          error: error.message,
          retryCount: communication.retryCount + 1,
        },
      });

      throw error;
    }
  }

  async applyDeliveryStatusFromWebhook(params: {
    organizationId: string;
    provider: string;
    payload: unknown;
  }): Promise<{ updated: boolean; communicationId?: string }> {
    const payload = this.asRecord(params.payload);
    const externalId = this.extractExternalMessageId(payload);
    const mappedStatus = this.extractDeliveryStatus(payload);

    if (!externalId || !mappedStatus) {
      return { updated: false };
    }

    const existing = await this.prisma.communication.findFirst({
      where: {
        organizationId: params.organizationId,
        externalId,
      },
    });

    if (!existing) {
      return { updated: false };
    }

    const now = new Date();
    const shouldMarkDelivered =
      (mappedStatus === CommunicationStatus.DELIVERED || mappedStatus === CommunicationStatus.READ) &&
      existing.status !== CommunicationStatus.DELIVERED &&
      existing.status !== CommunicationStatus.READ;

    if (existing.status === mappedStatus && !shouldMarkDelivered) {
      return { updated: false };
    }

    const updated = await this.prisma.communication.update({
      where: {
        id: existing.id,
      },
      data: {
        status: mappedStatus,
        deliveredAt:
          mappedStatus === CommunicationStatus.DELIVERED || mappedStatus === CommunicationStatus.READ
            ? existing.deliveredAt || now
            : existing.deliveredAt,
        readAt:
          mappedStatus === CommunicationStatus.READ ? existing.readAt || now : existing.readAt,
      },
    });

    if (shouldMarkDelivered) {
      await this.businessMetricsService.recordMessageDelivered({
        organizationId: params.organizationId,
        deliveredAt: now,
      });
    }

    return {
      updated: true,
      communicationId: updated.id,
    };
  }

  private async sendViaChannel(dto: SendMessageDto): Promise<{
    externalId?: string;
    deliveredAt?: Date;
  }> {
    switch (dto.channel) {
      case CommunicationChannel.WHATSAPP:
        return this.sendWhatsApp(dto);
      case CommunicationChannel.SMS:
        return this.sendSMS(dto);
      case CommunicationChannel.EMAIL:
        return this.sendEmail(dto);
      case CommunicationChannel.VOICE:
        return this.sendVoice(dto);
      default:
        throw new Error(`Unsupported channel: ${dto.channel}`);
    }
  }

  private async sendWhatsApp(dto: SendMessageDto): Promise<{
    externalId?: string;
    deliveredAt?: Date;
  }> {
    // Placeholder for WhatsApp Business API integration
    const apiKey = this.configService.get<string>('WHATSAPP_API_KEY');
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');

    if (!apiKey || !apiUrl) {
      this.logger.warn('WhatsApp API not configured, message queued');
      return {}; // Queue for later processing
    }

    // Example WhatsApp API call
    try {
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: dto.to,
          type: 'text',
          text: { body: dto.content },
        }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        externalId: data.messages[0]?.id,
        deliveredAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`WhatsApp send failed: ${error.message}`);
      throw error;
    }
  }

  private async sendSMS(dto: SendMessageDto): Promise<{
    externalId?: string;
    deliveredAt?: Date;
  }> {
    // Twilio integration example
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn('Twilio not configured, message queued');
      return {}; // Queue for later
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: dto.to,
            Body: dto.content,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        externalId: data.sid,
        deliveredAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`SMS send failed: ${error.message}`);
      throw error;
    }
  }

  private async sendEmail(dto: SendMessageDto): Promise<{
    externalId?: string;
    deliveredAt?: Date;
  }> {
    // Email integration (e.g., SendGrid, AWS SES)
    this.logger.log(`Email sent to ${dto.to}`);
    return {
      externalId: `email-${Date.now()}`,
      deliveredAt: new Date(),
    };
  }

  private async sendVoice(dto: SendMessageDto): Promise<{
    externalId?: string;
    deliveredAt?: Date;
  }> {
    // Voice call integration (e.g., Twilio Voice)
    this.logger.log(`Voice call to ${dto.to}`);
    return {
      externalId: `voice-${Date.now()}`,
      deliveredAt: new Date(),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private extractExternalMessageId(payload: Record<string, unknown>): string | undefined {
    const keys = [
      'messageId',
      'message_id',
      'externalId',
      'external_id',
      'id',
      'whatsappMessageId',
      'sid',
    ];
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }

  private extractDeliveryStatus(payload: Record<string, unknown>): CommunicationStatus | undefined {
    const candidates = [
      payload.status,
      payload.deliveryStatus,
      payload.delivery_status,
      payload.messageStatus,
      payload.message_status,
      payload.event,
      payload.type,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const normalized = candidate.trim().toLowerCase();
      if (['delivered', 'delivery_success', 'sent_success'].includes(normalized)) {
        return CommunicationStatus.DELIVERED;
      }
      if (['read', 'seen'].includes(normalized)) {
        return CommunicationStatus.READ;
      }
      if (['failed', 'undelivered', 'delivery_failed'].includes(normalized)) {
        return CommunicationStatus.FAILED;
      }
      if (['sent', 'queued', 'accepted'].includes(normalized)) {
        return CommunicationStatus.SENT;
      }
    }

    return undefined;
  }
}



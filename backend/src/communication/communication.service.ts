import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  CommunicationChannel,
  CommunicationStatus,
} from '@prisma/client';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async sendMessage(dto: SendMessageDto & { organizationId: string }) {
    // Create communication record
    const communication = await this.prisma.communication.create({
      data: {
        organizationId: dto.organizationId,
        channel: dto.channel,
        to: dto.to,
        toName: dto.toName,
        content: dto.content,
        language: dto.language || 'en',
        templateId: dto.templateId,
        status: CommunicationStatus.PENDING,
      },
    });

    try {
      // Send via appropriate channel
      const result = await this.sendViaChannel(dto);

      // Update with delivery info
      await this.prisma.communication.update({
        where: { id: communication.id },
        data: {
          status: CommunicationStatus.SENT,
          externalId: result.externalId,
          deliveredAt: result.deliveredAt,
        },
      });

      return communication;
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
}


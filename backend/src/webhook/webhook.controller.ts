import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { WebhookService } from './webhook.service';
import { SupportedWebhookProvider } from './webhook-dedup.util';
import { RequestWithContext } from '../common/interfaces/request-context.interface';

const SUPPORTED_PROVIDERS: SupportedWebhookProvider[] = ['whatsapp', 'momo', 'custom'];

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post(':provider/:organizationId')
  @HttpCode(200)
  async ingest(
    @Param('provider') provider: string,
    @Param('organizationId') organizationId: string,
    @Body() payload: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: Request,
  ) {
    const normalizedProvider = provider.toLowerCase() as SupportedWebhookProvider;
    if (!SUPPORTED_PROVIDERS.includes(normalizedProvider)) {
      throw new BadRequestException(
        `Unsupported provider. Allowed values: ${SUPPORTED_PROVIDERS.join(', ')}`,
      );
    }

    const sanitizedHeaders: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        sanitizedHeaders[key.toLowerCase()] = value[0];
      } else if (typeof value === 'string') {
        sanitizedHeaders[key.toLowerCase()] = value;
      }
    }

    const requestWithContext = request as RequestWithContext;
    return this.webhookService.ingest({
      provider: normalizedProvider,
      organizationId,
      payload,
      headers: sanitizedHeaders,
      correlationId: requestWithContext.correlationId,
    });
  }
}

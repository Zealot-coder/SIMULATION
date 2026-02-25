import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../event/event.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { CommunicationModule } from '../communication/communication.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PaymentIdempotencyService } from './payment-idempotency.service';
import { BusinessMetricsModule } from '../business-metrics/business-metrics.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EventModule,
    IdempotencyModule,
    CommunicationModule,
    BusinessMetricsModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, PaymentIdempotencyService],
  exports: [WebhookService, PaymentIdempotencyService],
})
export class WebhookModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../event/event.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PaymentIdempotencyService } from './payment-idempotency.service';

@Module({
  imports: [ConfigModule, PrismaModule, EventModule, IdempotencyModule],
  controllers: [WebhookController],
  providers: [WebhookService, PaymentIdempotencyService],
  exports: [WebhookService, PaymentIdempotencyService],
})
export class WebhookModule {}

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { SanitizeMiddleware } from './middleware/sanitize.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { HttpMetricsMiddleware } from './common/metrics/http-metrics.middleware';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { PrismaModule } from './prisma/prisma.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { EventModule } from './event/event.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AiModule } from './ai/ai.module';
import { CommunicationModule } from './communication/communication.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { AutomationModule } from './automation/automation.module';
import { HealthModule } from './health/health.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    LoggerModule,
    MetricsModule,
    IdempotencyModule,

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          return {
            connection: {
              host: parsed.hostname,
              port: Number(parsed.port || '6379'),
              username: parsed.username || undefined,
              password: parsed.password || undefined,
              ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
            },
          };
        }

        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = Number(configService.get<string>('REDIS_PORT') || '6379');
        const redisPassword = configService.get<string>('REDIS_PASSWORD') || undefined;
        const isProduction = configService.get<string>('NODE_ENV') === 'production';

        if (isProduction && !redisHost) {
          throw new Error(
            'Redis is required in production. Set REDIS_URL or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD.',
          );
        }

        return {
          connection: {
            host: redisHost || 'localhost',
            port: redisPort,
            password: redisPassword,
          },
        };
      },
    }),
    BullModule.registerQueue(
      {
        name: 'workflows',
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      },
      {
        name: 'events',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      },
    ),

    // Core modules
    PrismaModule,
    
    // Feature modules
    AuthModule,
    OrganizationModule,
    EventModule,
    WorkflowModule,
    AiModule,
    CommunicationModule,
    AuditModule,
    AdminModule,
    AutomationModule,
    HealthModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HttpMetricsMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, HttpMetricsMiddleware, SanitizeMiddleware, RateLimitMiddleware)
      .forRoutes('*');
  }
}

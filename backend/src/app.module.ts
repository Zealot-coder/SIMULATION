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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    LoggerModule,
    MetricsModule,

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: Number(configService.get<string>('REDIS_PORT') || '6379'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'workflows',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HttpMetricsMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
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

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { SanitizeMiddleware } from './middleware/sanitize.middleware';
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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Redis/BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SanitizeMiddleware, RateLimitMiddleware)
      .forRoutes('*');
  }
}

import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppLoggerService } from './app-logger.service';
import { CorrelationContextService } from '../context/correlation-context.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'simulation-backend',
      },
      transports: [new winston.transports.Console()],
    }),
  ],
  providers: [CorrelationContextService, AppLoggerService],
  exports: [WinstonModule, CorrelationContextService, AppLoggerService],
})
export class LoggerModule {}

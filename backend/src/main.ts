import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  initializeSentry();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/detailed', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.ALL },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...String(process.env.CORS_ORIGINS || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    'http://localhost:3000',
  ].filter(Boolean) as string[];
  const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-Id',
      'Idempotency-Key',
      'X-Webhook-Signature',
      'X-Webhook-Timestamp',
    ],
  });

  const port = process.env.PORT || 3001;
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`Attempting to listen on port ${port}`, 'Bootstrap');
  try {
    await app.listen(port);
    logger.log(`Backend server running on http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  } catch (error) {
    logger.error(
      'Failed to start HTTP server',
      error instanceof Error ? error.stack : undefined,
      'Bootstrap',
    );
    process.exit(1);
  }
}

function initializeSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      if (event.request?.data && typeof event.request.data === 'object') {
        event.request.data = redactSensitiveFields(event.request.data as Record<string, unknown>);
      }

      return event;
    },
  });
}

function redactSensitiveFields(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = new Set(['password', 'token', 'accessToken', 'refreshToken', 'apiKey']);
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.has(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = redactSensitiveFields(value as Record<string, unknown>);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

bootstrap();

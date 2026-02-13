import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);
  
  // Global validation pipe
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
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  const port = process.env.PORT || 3001;
  console.log(`⏱  Attempting to listen on port ${port}...`);
  try {
    await app.listen(port);
    console.log(`🚀 Backend server running on http://localhost:${port}/${apiPrefix}`);
  } catch (err) {
    console.error('❌ Failed to start HTTP server', err);
    process.exit(1);
  }
}

bootstrap();

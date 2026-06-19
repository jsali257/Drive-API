// BigInt fields from Prisma (storageQuotaBytes, size, etc.) need custom JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'verbose', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3003);
  const frontendUrl = config.get<string>('frontendUrl', 'http://localhost:3002');
  const nodeEnv = config.get<string>('nodeEnv', 'development');
  const corsOrigins = config.get<string>('cors.origins', frontendUrl);

  // Security headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // Compression
  app.use(compression());

  // CORS
  const allowedOrigins = corsOrigins.split(',').map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || nodeEnv === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new LoggingInterceptor(),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('RGV911 Drive API')
      .setDescription(
        'Self-hosted cloud storage platform — REST API documentation.\n\n' +
          'Authenticate via **JWT Bearer token** or **X-API-Key header**.',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .addTag('Auth', 'Authentication & authorization')
      .addTag('Files', 'File upload, download & management')
      .addTag('Folders', 'Folder management')
      .addTag('Shares', 'File & folder sharing')
      .addTag('API Keys', 'Developer API key management')
      .addTag('Search', 'Full-text search')
      .addTag('Users', 'User management')
      .addTag('Storage', 'Storage statistics')
      .addTag('System', 'System health & settings')
      .addTag('Logs', 'Audit & activity logs')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`RGV911 Drive API running on http://localhost:${port}/api`);
}

bootstrap();

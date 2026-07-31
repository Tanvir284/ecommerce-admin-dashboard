import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());

  // Enable CORS securely for frontend dashboard
  const defaultOrigins = [
    'http://localhost:5173',
    'https://ecommerce-admin-dashboard-seven.vercel.app',
  ];
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : defaultOrigins;
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Ecommerce Admin Backend REST API running on port ${port}`);
}

bootstrap();

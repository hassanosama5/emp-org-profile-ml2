// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // -----------------------------------
  // COOKIE PARSER - Required for HTTP-only cookies
  // -----------------------------------
  app.use(cookieParser());

  // -----------------------------------
  // CORS CONFIGURATION
  // -----------------------------------
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = [frontendUrl, 'http://localhost:3001'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true, // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // -----------------------------------
  // GLOBAL VALIDATION PIPE
  // -----------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove unexpected fields
      forbidNonWhitelisted: true, // throw error for invalid fields
      transform: true, // transforms payloads to dto classes
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // -----------------------------------
  // GLOBAL API PREFIX
  // -----------------------------------
  app.setGlobalPrefix('api/v1');

  // -----------------------------------
  // START SERVER
  // -----------------------------------
  const port = process.env.PORT || 6000;
  await app.listen(port);

  console.log('='.repeat(50));
  console.log(`🚀 HR System API`);
  console.log('='.repeat(50));
  console.log(`📍 Local: http://localhost:${port}/api/v1`);
  console.log(`🌐 Frontend: ${frontendUrl}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.DATABASE_NAME || 'hr_system'}`);
  console.log(
    `🔐 JWT: ${process.env.JWT_SECRET ? 'Configured ✓' : 'NOT SET!'}`,
  );
  console.log('='.repeat(50));
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('PyBlocks API')
    .setDescription(
      'The PyBlocks API documentation - A gamified Python learning platform with AI-powered feedback',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('missions', 'Coding missions/challenges')
    .addTag('submissions', 'Code submissions and results')
    .addTag('gamification', 'XP, levels, and badges')
    .addTag('progress', 'Learning progress tracking')
    .addTag('ai', 'AI-powered hints and recommendations')
    .addTag('analytics', 'Platform analytics')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'PyBlocks API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 PyBlocks Backend running on: http://localhost:${port}`);
  console.log(`📚 Swagger API Docs available at: http://localhost:${port}/api`);
  console.log(
    `📊 AI Service URL: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}`,
  );
}

void bootstrap();

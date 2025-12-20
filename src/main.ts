import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception/http-exception.filter';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';
import { PrismaClientExceptionFilter } from 'prisma/prisma-client-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'tasks',
      protoPath: join(__dirname, '../proto/tasks.proto'),
      url: 'localhost:50051',
    },
  });

  app.enableCors({
    origin: ['http://localhost:5173', 'https://tasks.webservertaskmanager.com'],
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new PrismaClientExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription('Task Manager API with DDD and Microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

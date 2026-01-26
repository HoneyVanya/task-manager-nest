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
import { ReddisIoAdapter } from './common/adapters/redis-io.adapter';

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

  const reddisIoAdapter = new ReddisIoAdapter(app);
  await reddisIoAdapter.connectToReddis();
  app.useWebSocketAdapter(reddisIoAdapter);

  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription('Real-time task management with REST, gRPC, and Redis')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { UsersModule } from './users/users.module';
import * as Joi from 'joi';
import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './redis/redis.module';
import { RedisThrottlerStorage } from './common/adapters/redis-throttler.storage';
import type { RedisClientType } from 'redis';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { IncomingMessage } from 'http';

interface PinoRequest extends IncomingMessage {
  raw: {
    body: unknown;
  };
  body: unknown;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),
        FRONTEND_URL: Joi.string().required(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    RedisModule,
    TasksModule,
    PrismaModule,
    AuthModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        redact: [
          'req.headers.authorization',
          'req.body.password',
          'req.body.token',
        ],
        genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
        serializers: {
          req: (req) => {
            const pinoReq = req as PinoRequest;
            if (pinoReq.raw && pinoReq.raw.body) {
              pinoReq.body = pinoReq.raw.body;
            }
            return pinoReq;
          },
        },
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: ['REDIS_CLIENT'],
      useFactory: (redis: RedisClientType) => ({
        throttlers: [
          {
            ttl: 60000,
            limit: 10,
          },
        ],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    UsersModule,
    HealthModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: 'localhost',
          port: 6379,
        },
      }),
    }),
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

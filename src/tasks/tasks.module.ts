import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { TasksService } from './application/tasks.service';
import { TasksController } from './infrastructure/presentation/tasks.controller';
import { TasksGateway } from './infrastructure/gateway/tasks.gateway';
import { PrismaTaskRepository } from './infrastructure/persistence/prisma-task.repository';
import { PrismaBoardRepository } from './infrastructure/persistence/prisma-board.repository';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: 'localhost',
            port: 6379,
          },
          ttl: 60 * 1000,
        }),
      }),
    }),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksGateway,
    { provide: 'TaskRepository', useClass: PrismaTaskRepository },
    { provide: 'BoardRepository', useClass: PrismaBoardRepository },
  ],
  exports: ['BoardRepository'],
})
export class TasksModule {}

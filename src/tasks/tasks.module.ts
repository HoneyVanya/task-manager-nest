import { Module } from '@nestjs/common';
import { PrismaBoardRepository } from './infrastructure/persistence/prisma-board.repository';
import { TasksController } from './infrastructure/presentation/tasks.controller';
import { TasksService } from './application/tasks.service';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaTaskRepository } from './infrastructure/persistence/prisma-task.repository';
import { TasksGateway } from './infrastructure/gateway/tasks.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    { provide: 'TaskRepository', useClass: PrismaTaskRepository },
    { provide: 'BoardRepository', useClass: PrismaBoardRepository },
    TasksGateway,
  ],
  exports: ['BoardRepository'],
})
export class TasksModule {}

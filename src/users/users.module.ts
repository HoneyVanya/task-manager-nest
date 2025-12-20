import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { UsersController } from './infrastructure/presentation/users.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [PrismaModule, TasksModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: 'UserRepository', useClass: PrismaUserRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}

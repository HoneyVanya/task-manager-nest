import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Param,
  UseFilters,
  Query,
} from '@nestjs/common';
import { TasksService } from 'src/tasks/application/tasks.service';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { UpdateTaskDto } from 'src/tasks/dto/update-task.dto';
import { GetTasksFilterDto } from 'src/tasks/dto/get-tasks.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/infrastructure/decorators/get-user.decorator';
import { User } from 'src/users/domain/user.entity';
import { GrpcMethod } from '@nestjs/microservices';
import { GrpcExceptionFilter } from 'src/common/rpc-exception.filter';
import { Role } from '@prisma/client';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('general')
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Query() filterDto: GetTasksFilterDto) {
    return this.tasksService.findGeneralTasks(filterDto);
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  async getMyTasks(
    @GetUser() user: User,
    @Query() filterDto: GetTasksFilterDto,
  ) {
    return this.tasksService.findPrivateTasks(
      user.id,
      user.role,
      undefined,
      filterDto,
    );
  }

  @Get('user/:targetUserId')
  @UseGuards(AuthGuard('jwt'))
  async getUserTasks(
    @Param('targetUserId') targetUserId: string,
    @GetUser() user: User,
    @Query() filterDto: GetTasksFilterDto,
  ) {
    return this.tasksService.findPrivateTasks(
      user.id,
      user.role,
      targetUserId,
      filterDto,
    );
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User) {
    return this.tasksService.create(createTaskDto, user.id);
  }

  @Patch(':id/accept')
  @UseGuards(AuthGuard('jwt'))
  async accept(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.acceptTask(id, user.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, user.id, updateTaskDto);
  }

  @GrpcMethod('TasksService', 'FindAll')
  @UseFilters(new GrpcExceptionFilter())
  async findAllGrpc(data: { userId: string; page: number; limit: number }) {
    console.log('📡 gRPC FindAll Request:', data);

    const filterDto: GetTasksFilterDto = {
      page: data.page || 1,
      limit: data.limit || 10,
    };
    return {
      tasks: await this.tasksService.findPrivateTasks(
        data.userId,
        Role.USER,
        undefined,
        filterDto,
      ),
    };
  }

  @GrpcMethod('TasksService', 'Create')
  @UseFilters(new GrpcExceptionFilter())
  async createGrpc(data: { title: string; authorId: string }) {
    return this.tasksService.create({ title: data.title }, data.authorId);
  }
}

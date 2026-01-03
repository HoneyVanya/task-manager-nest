import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import type { RedisClientType } from 'redis';
import type { TaskRepository } from '../domain/task.repository';
import type { BoardRepository } from '../domain/board.repository';
import { Task } from '../domain/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { GetTasksFilterDto } from '../dto/get-tasks.dto';
import { TasksGateway } from '../infrastructure/gateway/tasks.gateway';
import { GENERAL_BOARD_ID } from 'src/common/constants';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    @Inject('TaskRepository')
    private readonly taskRepository: TaskRepository,
    @Inject('BoardRepository')
    private readonly boardRepository: BoardRepository,
    private readonly tasksGateway: TasksGateway,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  private async clearGeneralBoardCache() {
    const keys = await this.redisClient.keys('general_board*');
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }

  async findGeneralTasks(filterDto: GetTasksFilterDto): Promise<Task[]> {
    const { page, limit } = filterDto;
    const cacheKey = `general_board_p${page}_l${limit}`;

    console.log(`🔍 [Cache Check] Key: ${cacheKey}`);

    const cachedString = await this.redisClient.get(cacheKey);

    if (cachedString) {
      console.log(`✅ [Cache HIT] Returning cached data`);
      return JSON.parse(cachedString);
    }

    console.log(`⚠️ [Cache MISS] Fetching from DB...`);
    const skip = (page - 1) * limit;

    const tasks = await this.taskRepository.findAllByBoard(
      GENERAL_BOARD_ID,
      skip,
      limit,
    );

    console.log(`💾 [Cache SET] Saving ${tasks.length} tasks to Redis...`);

    await this.redisClient.set(cacheKey, JSON.stringify(tasks), { EX: 60 });

    console.log(`🎉 [Cache SET] Success!`);

    return tasks;
  }

  async findPrivateTasks(
    requesterId: string,
    requesterRole: Role,
    targetUserId?: string,
    filterDto: GetTasksFilterDto = new GetTasksFilterDto(),
  ): Promise<Task[]> {
    const { page, limit } = filterDto;
    const skip = (page - 1) * limit;

    let userIdToFetch = requesterId;

    if (targetUserId) {
      if (requesterRole !== Role.ADMIN) {
        throw new ForbiddenException('Only admins can view other users tasks');
      }
      userIdToFetch = targetUserId;
    }

    const board = await this.boardRepository.findPrivateByOwner(userIdToFetch);

    if (!board) return [];

    return this.taskRepository.findAllByBoard(board.id, skip, limit);
  }

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    let targetBoardId: string;

    if (createTaskDto.boardId === GENERAL_BOARD_ID) {
      targetBoardId = GENERAL_BOARD_ID;
      await this.clearGeneralBoardCache();
    } else {
      const userBoard = await this.boardRepository.findPrivateByOwner(userId);
      if (!userBoard) {
        throw new NotFoundException('User private board not found');
      }
      targetBoardId = userBoard.id;
    }

    const newTask = new Task(
      randomUUID(),
      createTaskDto.title,
      null,
      false,
      userId,
      targetBoardId,
      null,
      1,
      new Date(),
      new Date(),
    );

    await this.taskRepository.save(newTask);

    this.tasksGateway.notifyTaskUpdated(targetBoardId, newTask);

    return newTask;
  }

  async acceptTask(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (task.boardId !== GENERAL_BOARD_ID) {
      throw new ConflictException(
        'Can only accept tasks from the General Board',
      );
    }

    const privateBoard = await this.boardRepository.findPrivateByOwner(userId);
    if (!privateBoard) throw new NotFoundException('User board not found');

    await this.clearGeneralBoardCache();

    task.accept(privateBoard.id, userId);
    await this.taskRepository.save(task);

    this.tasksGateway.notifyTaskUpdated(GENERAL_BOARD_ID, task);
    this.tasksGateway.notifyTaskUpdated(privateBoard.id, task);

    return task;
  }

  async update(
    taskId: string,
    userId: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const task = await this.taskRepository.findById(taskId);
        if (!task) throw new NotFoundException('Task not found');
        const isAuthor = task.authorId === userId;
        const isAssignee = task.assigneeId === userId;

        if (!isAuthor && !isAssignee) {
          throw new ForbiddenException('You do not own or work on this task');
        }
        task.update(updateTaskDto.title, updateTaskDto.completed, task.version);

        await this.taskRepository.save(task);

        this.tasksGateway.notifyTaskUpdated(task.boardId, task);

        return task;
      } catch (error: any) {
        if (error instanceof ConflictException) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Concurrency limit reached');
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (task.authorId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }
    await this.taskRepository.delete(taskId);
  }
}

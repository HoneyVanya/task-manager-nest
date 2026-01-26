import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TasksGateway } from '../infrastructure/gateway/tasks.gateway';
import { Task } from '../domain/task.entity';
import { TaskRepository } from '../domain/task.repository';
import { BoardRepository } from '../domain/board.repository';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { GENERAL_BOARD_ID } from 'src/common/constants';
import { GetTasksFilterDto } from '../dto/get-tasks.dto';
import { Board } from '../domain/board.entity';

interface MockRedisClient {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  keys: jest.Mock;
}

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: jest.Mocked<TaskRepository>;
  let boardRepo: jest.Mocked<BoardRepository>;
  let gateway: jest.Mocked<TasksGateway>;
  let mockRedis: MockRedisClient;

  beforeEach(async () => {
    const mockTaskRepoProvider = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByBoard: jest.fn(),
      findAllByAuthor: jest.fn(),
      delete: jest.fn(),
    };

    const mockBoardRepoProvider = {
      save: jest.fn(),
      findPrivateByOwner: jest.fn(),
    };

    const mockGatewayProvider = {
      notifyTaskUpdated: jest.fn(),
    };

    const mockRedisProvider = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: 'TaskRepository', useValue: mockTaskRepoProvider },
        { provide: 'BoardRepository', useValue: mockBoardRepoProvider },
        { provide: TasksGateway, useValue: mockGatewayProvider },
        { provide: 'REDIS_CLIENT', useValue: mockRedisProvider },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    taskRepo = module.get('TaskRepository');
    boardRepo = module.get('BoardRepository');
    gateway = module.get(TasksGateway);
    mockRedis = module.get('REDIS_CLIENT');

    jest.clearAllMocks();
  });

  describe('acceptTask', () => {
    it('should successfully move a task from general board to private board', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';
      const privateBoardId = 'private-board-1';

      const task = new Task(
        taskId,
        'title',
        null,
        false,
        'author',
        GENERAL_BOARD_ID,
        null,
        1,
        new Date(),
        new Date(),
      );

      taskRepo.findById.mockResolvedValue(task);
      boardRepo.findPrivateByOwner.mockResolvedValue({
        id: privateBoardId,
      } as unknown as Board);

      const result = await service.acceptTask(taskId, userId);

      expect(result.boardId).toEqual(privateBoardId);
      expect(result.assigneeId).toEqual(userId);
      expect(result.version).toEqual(2);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(taskRepo.save).toHaveBeenCalledWith(task);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(gateway.notifyTaskUpdated).toHaveBeenCalledTimes(2);

      expect(mockRedis.keys).toHaveBeenCalled();
    });

    it('should fail if task is NOT on General Board', async () => {
      const task = new Task(
        'id',
        'Title',
        null,
        false,
        'author',
        'other-board',
        null,
        1,
        new Date(),
        new Date(),
      );
      taskRepo.findById.mockResolvedValue(task);

      await expect(service.acceptTask('id', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should fail if task does not exist', async () => {
      taskRepo.findById.mockResolvedValue(null);
      await expect(service.acceptTask('bad task', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create task on General Board if no boardId provided (Default)', async () => {
      const dto = { title: 'New Task', boardId: GENERAL_BOARD_ID };

      taskRepo.save.mockImplementation(() => Promise.resolve());

      const result = await service.create(dto, 'admin-id');

      expect(result.boardId).toEqual(GENERAL_BOARD_ID);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(gateway.notifyTaskUpdated).toHaveBeenCalledWith(
        GENERAL_BOARD_ID,
        result,
      );
      expect(mockRedis.keys).toHaveBeenCalled();
    });
  });

  describe('findGeneralTasks', () => {
    it('should return tasks from repository', async () => {
      const mockResult = [{ id: '1' }] as Task[];
      taskRepo.findAllByBoard.mockResolvedValue(mockResult);
      mockRedis.get.mockResolvedValue(null);

      const result = await service.findGeneralTasks({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(taskRepo.findAllByBoard).toHaveBeenCalledWith(
        GENERAL_BOARD_ID,
        0,
        10,
      );
      expect(mockRedis.set).toHaveBeenCalled();
    });
    it('should return tasks from Redis (Cache Hit)', async () => {
      const cachedTasks = [{ id: 'cached-1', title: 'Cached' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedTasks));

      const result = await service.findGeneralTasks({ page: 1, limit: 10 });

      expect(result).toEqual(cachedTasks);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(taskRepo.findAllByBoard).not.toHaveBeenCalled();
    });
  });

  describe('findPrivateTasks', () => {
    it('should allow User to see their own tasks', async () => {
      const userId = 'my-id';
      const mockResult = [{ id: '1' }] as Task[];
      taskRepo.findAllByBoard.mockResolvedValue(mockResult);
      boardRepo.findPrivateByOwner.mockResolvedValue({
        id: 'my-board',
      } as unknown as Board);

      const result = await service.findPrivateTasks(
        userId,
        Role.USER,
        undefined,
        { page: 1, limit: 10 },
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(boardRepo.findPrivateByOwner).toHaveBeenCalledWith(userId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(taskRepo.findAllByBoard).toHaveBeenCalledWith(
        'my-board',
        expect.any(Number),
        expect.any(Number),
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw Forbidden if User tries to see another user tasks', async () => {
      await expect(
        service.findPrivateTasks(
          'my-id',
          Role.USER,
          'other-id',
          new GetTasksFilterDto(),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Admin to see another user tasks', async () => {
      const targetId = 'target-id';
      boardRepo.findPrivateByOwner.mockResolvedValue({
        id: 'target-board',
      } as unknown as Board);
      taskRepo.findAllByBoard.mockResolvedValue([]);

      await service.findPrivateTasks(
        'admin-id',
        Role.ADMIN,
        targetId,
        new GetTasksFilterDto(),
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(boardRepo.findPrivateByOwner).toHaveBeenCalledWith(targetId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(taskRepo.findAllByBoard).toHaveBeenCalled();
    });
  });
});

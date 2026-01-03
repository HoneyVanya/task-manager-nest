import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TasksGateway } from '../infrastructure/gateway/tasks.gateway';
import { Task } from '../domain/task.entity';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { GENERAL_BOARD_ID } from 'src/common/constants';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo;
  let boardRepo;
  let gateway;

  const mockTaskRepo = {
    save: jest.fn(),
    findById: jest.fn(),
    findAllByBoard: jest.fn(),
  };

  const mockBoardRepo = {
    findPrivateByOwner: jest.fn(),
  };

  const mockGateway = {
    notifyTaskUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: 'TaskRepository', useValue: mockTaskRepo },
        { provide: 'BoardRepository', useValue: mockBoardRepo },
        { provide: TasksGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepo = module.get('TaskRepository');
    boardRepo = module.get('BoardRepository');
    gateway = module.get<TasksGateway>(TasksGateway);

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
      boardRepo.findPrivateByOwner.mockResolvedValue({ id: privateBoardId });

      const result = await service.acceptTask(taskId, userId);

      expect(result.boardId).toEqual(privateBoardId);
      expect(result.assigneeId).toEqual(userId);
      expect(result.version).toEqual(2);

      expect(taskRepo.save).toHaveBeenCalledWith(task);
      expect(gateway.notifyTaskUpdated).toHaveBeenCalledTimes(2);
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

      taskRepo.save.mockImplementation(async (t) => t);

      const result = await service.create(dto, 'admin-id');

      expect(result.boardId).toEqual(GENERAL_BOARD_ID);
      expect(gateway.notifyTaskUpdated).toHaveBeenCalledWith(
        GENERAL_BOARD_ID,
        result,
      );
    });
  });

  describe('findGeneralTasks', () => {
    it('should return tasks from repository', async () => {
      const mockResult = [{ id: '1' }];
      taskRepo.findAllByBoard.mockResolvedValue(mockResult);

      const result = await service.findGeneralTasks({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
      expect(taskRepo.findAllByBoard).toHaveBeenCalledWith(
        GENERAL_BOARD_ID,
        0,
        10,
      );
    });
  });

  describe('findPrivateTasks', () => {
    it('should allow User to see their own tasks', async () => {
      const userId = 'my-id';
      const mockResult = [{ id: 1 }];
      taskRepo.findAllByBoard.mockResolvedValue(mockResult);
      boardRepo.findPrivateByOwner.mockResolvedValue({ id: 'my-board' });

      const result = await service.findPrivateTasks(
        userId,
        Role.USER,
        undefined,
        { page: 1, limit: 10 },
      );

      expect(boardRepo.findPrivateByOwner).toHaveBeenCalledWith(userId);
      expect(taskRepo.findAllByBoard).toHaveBeenCalledWith(
        'my-board',
        expect.any(Number),
        expect.any(Number),
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw Forbidden if User tries to see another user tasks', async () => {
      await expect(
        service.findPrivateTasks('my-id', Role.USER, 'other-id', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Admin to see another user tasks', async () => {
      const targetId = 'target-id';
      boardRepo.findPrivateByOwner.mockResolvedValue({
        id: 'target-board',
      });
      taskRepo.findAllByBoard.mockResolvedValue([]);

      await service.findPrivateTasks(
        'admin-id',
        Role.ADMIN,
        targetId,
        {} as any,
      );

      expect(boardRepo.findPrivateByOwner).toHaveBeenCalledWith(targetId);
      expect(taskRepo.findAllByBoard).toHaveBeenCalled();
    });
  });
});

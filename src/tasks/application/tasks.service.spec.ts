import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { TasksGateway } from '../infrastructure/gateway/tasks.gateway';

const mockTaskRepository = {
  save: jest.fn(),
  findAllByAuthor: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn(),
};

const mockBoardRepository = {
  findPrivateByOwner: jest.fn(),
};

const mockTasksGateway = {
  notifyTaskUpdated: jest.fn(),
};

const mockPrismaService = {
  board: {
    findFirst: jest.fn(),
  },
  task: {
    create: jest.fn(),
  },
};

describe('TasksService', () => {
  let service: TasksService;
  let repository: typeof mockTaskRepository;
  let boardRepository: typeof mockBoardRepository;
  let gateway: typeof mockTasksGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: 'TaskRepository', useValue: mockTaskRepository },
        { provide: 'BoardRepository', useValue: mockBoardRepository },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TasksGateway, useValue: mockTasksGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    repository = module.get('TaskRepository');
    boardRepository = module.get('BoardRepository');
    gateway = module.get(TasksGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task and return it', async () => {
      const userId = 'user123';
      const createTaskDto: CreateTaskDto = {
        title: 'Unit Test Task',
      };

      mockBoardRepository.findPrivateByOwner.mockResolvedValue({
        id: 'board-123',
      });

      const result = await service.create(createTaskDto, userId);

      expect(result.title).toEqual('Unit Test Task');
      expect(boardRepository.findPrivateByOwner).toHaveBeenCalledWith(userId);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          boardId: 'board-123',
        }),
      );
    });
  });

  describe('update', () => {
    it('should update task and notify via gateway', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';

      const existingTask = {
        id: taskId,
        authorId: userId,
        boardId: 'board-1',
        version: 1,
        update: jest.fn(),
      };

      mockTaskRepository.findById.mockResolvedValue(existingTask);

      await service.update(taskId, userId, { version: 1, title: 'New' });

      expect(mockTaskRepository.save).toHaveBeenCalled();

      expect(gateway.notifyTaskUpdated).toHaveBeenCalledWith(
        'board-1',
        existingTask,
      );
    });
  });
});

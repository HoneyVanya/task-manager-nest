import { Test, TestingModule } from '@nestjs/testing';
import { PrismaTaskRepository } from './prisma-task.repository';
import { PrismaService } from 'prisma/prisma.service';
import { Task } from 'src/tasks/domain/task.entity';
import { ConflictException } from '@nestjs/common';
import { BoardType, Board, Role } from '@prisma/client';

describe('PrismaTaskRepository (integration)', () => {
  let repository: PrismaTaskRepository;
  let prisma: PrismaService;

  let user: { id: string };
  let board: Board;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaTaskRepository, PrismaService],
    }).compile();

    repository = module.get<PrismaTaskRepository>(PrismaTaskRepository);
    prisma = module.get<PrismaService>(PrismaService);

    await prisma.onModuleInit();

    await prisma.task.deleteMany();
    await prisma.board.deleteMany();
    await prisma.user.deleteMany();

    user = await prisma.user.create({
      data: {
        email: 'test-repo@example.com',
        username: 'RepoTester',
        password: 'hash',
        role: Role.USER,
      },
    });

    board = await prisma.board.create({
      data: {
        title: 'Integration Board',
        type: BoardType.PRIVATE,
        ownerId: user.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.board.deleteMany();
    await prisma.user.deleteMany();
    await prisma.onModuleDestroy();
  });

  it('should save a new task', async () => {
    const task = new Task(
      'task-1',
      'Integration Task',
      'Desc',
      false,
      user.id,
      board.id,
      null,
      1,
      new Date(),
      new Date(),
    );

    await repository.save(task);

    const saved = await prisma.task.findUnique({ where: { id: 'task-1' } });
    expect(saved).toBeDefined();
    expect(saved?.title).toBe('Integration Task');
  });

  it('should throw ConflictException on OCC violation in DB', async () => {
    await prisma.task.create({
      data: {
        id: 'task-occ',
        title: 'DB Version',
        boardId: board.id,
        authorId: user.id,
        version: 10,
      },
    });

    const task = new Task(
      'task-occ',
      'New Title',
      'Desc',
      false,
      user.id,
      board.id,
      null,
      6,
      new Date(),
      new Date(),
    );

    await expect(repository.save(task)).rejects.toThrow(ConflictException);
  });

  describe('findAllByBoard', () => {
    beforeEach(async () => {
      await prisma.task.deleteMany();
      await prisma.task.createMany({
        data: [
          {
            id: 't1',
            title: 'Task 1',
            boardId: board.id,
            authorId: user.id,
            version: 1,
          },
          {
            id: 't2',
            title: 'Task 2',
            boardId: board.id,
            authorId: user.id,
            version: 1,
          },
          {
            id: 't3',
            title: 'Task 3',
            boardId: board.id,
            authorId: user.id,
            version: 1,
          },
        ],
      });
    });

    it('should return paginated tasks for a specific board', async () => {
      const tasks = await repository.findAllByBoard(board.id, 0, 2);

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toBeInstanceOf(Task);
      expect(tasks[0].title).toBe('Task 1');
    });

    it('should return empty array if board has no tasks', async () => {
      const emptyTasks = await repository.findAllByBoard(
        'non-existent-board',
        0,
        10,
      );
      expect(emptyTasks).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a Task entity if found', async () => {
      const task = await repository.findById('t1');
      expect(task).toBeInstanceOf(Task);
      expect(task?.id).toBe('t1');
    });

    it('should return null if not found', async () => {
      const task = await repository.findById('missing');
      expect(task).toBeNull();
    });
  });
});

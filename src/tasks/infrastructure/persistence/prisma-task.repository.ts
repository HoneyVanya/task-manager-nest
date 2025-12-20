import { Injectable, ConflictException } from '@nestjs/common';
import { TaskRepository } from 'src/tasks/domain/task.repository';
import { Task } from 'src/tasks/domain/task.entity';
import { PrismaService } from 'prisma/prisma.service';
import { TaskMapper } from './task.mapper';

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(task: Task): Promise<void> {
    const data = TaskMapper.toPersistence(task);

    if (task.version === 1) {
      await this.prisma.task.create({ data });
      return;
    }

    const result = await this.prisma.task.updateMany({
      where: {
        id: task.id,
        version: task.version - 1,
      },
      data: data,
    });

    if (result.count === 0) {
      throw new ConflictException('Task version mismatch. Please refresh.');
    }
  }

  async findById(id: string): Promise<Task | null> {
    const raw = await this.prisma.task.findUnique({ where: { id } });
    if (!raw) return null;
    return TaskMapper.toDomain(raw);
  }

  async findAllByBoard(
    boardId: string,
    skip: number,
    take: number,
  ): Promise<Task[]> {
    const rawTasks = await this.prisma.task.findMany({
      where: { boardId },
      skip,
      take,
    });
    return rawTasks.map((task) => TaskMapper.toDomain(task));
  }

  async findAllByAuthor(
    authorId: string,
    skip: number,
    take: number,
  ): Promise<Task[]> {
    const rawTasks = await this.prisma.task.findMany({
      where: { authorId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    return rawTasks.map((task) => TaskMapper.toDomain(task));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}

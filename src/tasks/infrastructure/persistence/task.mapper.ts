import { Task as PrismaTask } from '@prisma/client';
import { Task } from '../../domain/task.entity';

export class TaskMapper {
  static toDomain(raw: PrismaTask): Task {
    return new Task(
      raw.id,
      raw.title,
      raw.description,
      raw.completed,
      raw.authorId,
      raw.boardId,
      raw.assigneeId,
      raw.version,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistence(entity: Task): PrismaTask {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      completed: entity.completed,
      authorId: entity.authorId,
      boardId: entity.boardId,
      assigneeId: entity.assigneeId,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

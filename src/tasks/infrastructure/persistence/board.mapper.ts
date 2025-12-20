import { Board as PrismaBoard } from '@prisma/client';
import { Board } from 'src/tasks/domain/board.entity';

export class BoardMapper {
  static toDomain(raw: PrismaBoard): Board {
    return new Board(
      raw.id,
      raw.title,
      raw.type,
      raw.ownerId,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistence(entity: Board): PrismaBoard {
    return {
      id: entity.id,
      title: entity.title,
      type: entity.type,
      ownerId: entity.ownerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

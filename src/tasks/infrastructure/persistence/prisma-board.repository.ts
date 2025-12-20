import { Injectable } from '@nestjs/common';
import {
  BoardRepository,
  Transaction,
} from 'src/tasks/domain/board.repository';
import { Board } from 'src/tasks/domain/board.entity';
import { PrismaService } from 'prisma/prisma.service';
import { BoardMapper } from './board.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaBoardRepository implements BoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(board: Board, tx?: Transaction): Promise<Board> {
    const client = (tx as Prisma.TransactionClient) || this.prisma;

    const data = BoardMapper.toPersistence(board);

    const saveBoard = await client.board.upsert({
      where: { id: board.id },
      update: data,
      create: data,
    });

    return BoardMapper.toDomain(saveBoard);
  }

  async findPrivateByOwner(ownerId: string): Promise<Board | null> {
    const raw = await this.prisma.board.findFirst({
      where: {
        ownerId,
        type: 'PRIVATE',
      },
    });
    return raw ? BoardMapper.toDomain(raw) : null;
  }
}

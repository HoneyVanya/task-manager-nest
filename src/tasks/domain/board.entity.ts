import { BoardType } from '@prisma/client';

export class Board {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly type: BoardType,
    public readonly ownerId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  canEdit(userId: string): boolean {
    if (this.type === BoardType.PUBLIC) return true;
    return this.ownerId === userId;
  }
}

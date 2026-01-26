import { ConflictException } from '@nestjs/common';

export class Task {
  constructor(
    public readonly id: string,
    public title: string,
    public description: string | null,
    public completed: boolean,
    public readonly authorId: string,
    public readonly boardId: string,
    public assigneeId: string | null,
    public version: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  update(
    title: string | undefined,
    completed: boolean | undefined,
    version: number,
  ): void {
    if (version !== this.version) {
      throw new ConflictException(
        `Optimistic Lock Error: You are trying to update version ${version}, but the server has version ${this.version}. Please refresh.`,
      );
    }
    if (title !== undefined) this.title = title;
    if (completed !== undefined) this.completed = completed;

    this.version++;
  }

  accept(newBoardId: string, newAssigneeId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (this as any).boardId = newBoardId;
    this.assigneeId = newAssigneeId;
    this.version++;
  }

  assignTo(userId: string) {
    this.assigneeId = userId;
    this.version++;
  }
}

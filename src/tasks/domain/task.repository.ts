import { Task } from './task.entity';

export interface TaskRepository {
  save(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findAllByBoard(boardId: string, skip: number, page: number): Promise<Task[]>;
  findAllByAuthor(
    authorId: string,
    skip: number,
    take: number,
  ): Promise<Task[]>;
  delete(id: string): Promise<void>;
}

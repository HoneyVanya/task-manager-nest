import { Task } from './task.entity';
import { ConflictException } from '@nestjs/common';

describe('Task Entity (Domain)', () => {
  const fixedDate = new Date();

  const createTask = (version = 1) =>
    new Task(
      'task-id',
      'Original Title',
      'Desc',
      false,
      'author-id',
      'board-id',
      null,
      version,
      fixedDate,
      fixedDate,
    );

  it('shoul increment version when updated', () => {
    const task = createTask(1);

    task.update('New title', true, 1);

    expect(task.version).toBe(2);
    expect(task.title).toBe('New title');
    expect(task.completed).toBe(true);
  });

  it('should throw ConflictException if version does not match', () => {
    const task = createTask(1);

    expect(() => {
      task.update('New Title', true, 5);
    }).toThrow(ConflictException);
  });

  it('should not increment version if no changes are made? (Design Decision)', () => {
    const task = createTask(1);
    task.update(undefined, undefined, 1);
    expect(task.version).toBe(2);
  });
});

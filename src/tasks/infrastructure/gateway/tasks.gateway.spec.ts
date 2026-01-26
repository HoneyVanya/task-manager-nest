import { Test, TestingModule } from '@nestjs/testing';
import { TasksGateway } from './tasks.gateway';
import { Server, Socket } from 'socket.io';

describe('TasksGateway', () => {
  let gateway: TasksGateway;
  let mockServer: { to: jest.Mock; emit: jest.Mock };

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksGateway],
    }).compile();

    gateway = module.get<TasksGateway>(TasksGateway);

    gateway.server = mockServer as unknown as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinBoard', () => {
    it('should join the correct socket room', async () => {
      const mockSocket = {
        id: 'socket-123',
        join: jest.fn().mockResolvedValue(undefined),
      };

      const boardId = 'board-456';
      const result = await gateway.handleJoinBoard(
        boardId,
        mockSocket as unknown as Socket,
      );

      expect(mockSocket.join).toHaveBeenCalledWith(`board:${boardId}`);
      expect(result.event).toBe('joined');
    });
  });

  describe('notifyTaskUpdate', () => {
    it('should emit "taskUpdated" to the specific board room', () => {
      const boardId = 'board-789';
      const taskPayload = { id: 'task-1', title: 'Test' };

      gateway.notifyTaskUpdated(boardId, taskPayload);

      expect(mockServer.to).toHaveBeenCalledWith(`board:${boardId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('taskUpdated', taskPayload);
    });
  });
});

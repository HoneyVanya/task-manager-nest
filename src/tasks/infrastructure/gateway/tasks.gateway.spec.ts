import { Test, TestingModule } from '@nestjs/testing';
import { TasksGateway } from './tasks.gateway';

describe('TasksGateway', () => {
  let gateway: TasksGateway;
  let mockServer: any;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksGateway],
    }).compile();

    gateway = module.get<TasksGateway>(TasksGateway);

    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinBoard', () => {
    it('should join the correct socket room', () => {
      const mockSocket = {
        id: 'socket-123',
        join: jest.fn(),
      } as any;

      const boardId = 'board-456';
      const result = gateway.handleJoinBoard(boardId, mockSocket);

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

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  user: {
    update: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockUserRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  delete: jest.fn(),
};

const mockBoardRepository = {
  save: jest.fn(),
};

const mockTransactionManager = {
  run: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
    callback(mockPrismaService),
  ),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: 'UserRepository', useValue: mockUserRepository },
        { provide: 'BoardRepository', useValue: mockBoardRepository },
        { provide: 'TransactionManager', useValue: mockTransactionManager },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('delete', () => {
    it('should delete the user if they exist', async () => {
      mockUserRepository.findById.mockResolvedValue({ id: 'user-1' });
      mockUserRepository.delete.mockResolvedValue(undefined);

      await service.delete('user-1');

      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1');
    });
    it('Should throw notFoundException if user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.delete('bad-id')).rejects.toThrow(NotFoundException);

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });
});

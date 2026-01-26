import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/application/users.service';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { getQueueToken } from '@nestjs/bullmq';

jest.mock('bcryptjs');

interface MockUsersService {
  create: jest.Mock;
  findByEmail: jest.Mock;
  findOne: jest.Mock;
}

interface MockQueue {
  add: jest.Mock;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersService: MockUsersService;
  let mockQueue: MockQueue;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    password: 'hashed-password',
    username: 'tester',
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: {} },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('mock-token') },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret') },
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        username: 'tester',
        password: 'password123',
      });

      expect(result.user.email).toBe(mockUser.email);
      expect(usersService.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith('welcome-email', {
        email: mockUser.email,
        username: mockUser.username,
      });
    });

    it('should throw ConfictException if email exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'tester',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('logic', () => {
    it('should retrun tokens for valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from 'src/auth/application/auth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  const mockUserResponse = {
    user: { id: 'uuid', email: 'test@example.com', username: 'tester' },
    accessToken: 'at',
    refreshToken: 'rt',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockUserResponse),
            login: jest.fn().mockResolvedValue({
              accessToken: 'at',
              refreshToken: 'rt',
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should call AuthService.register and return the result', async () => {
      const dto = {
        email: 'test@example',
        username: 'tester',
        password: 'password123',
      };
      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result.accessToken).toBe('at');
    });
  });
});

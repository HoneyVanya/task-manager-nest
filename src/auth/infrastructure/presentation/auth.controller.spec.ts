import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from 'src/auth/application/auth.service';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from 'src/auth/dto/login.dto';

interface MockAuthService {
  register: jest.Mock;
  login: jest.Mock;
  generateTokens: jest.Mock;
  refreshToken: typeof jest.fn;
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: MockAuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    generateTokens: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockUserResponse = {
    user: { id: 'uuid', email: 'test@example.com', username: 'tester' },
    accessToken: 'at',
    refreshToken: 'rt',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call AuthService.register and return the result', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        username: 'tester',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue(mockUserResponse);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
      };

      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(loginResponse);
    });
  });
});

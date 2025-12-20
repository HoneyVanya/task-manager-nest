import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from 'src/users/application/users.service';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { User } from 'src/users/domain/user.entity';

const mockUserEntity = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            update: jest.fn().mockResolvedValue(mockUserEntity),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateProfile', () => {
    it('Should delegate to UsersService.update with correct params', async () => {
      const dto: UpdateUserDto = { username: 'UpdatedName' };
      const user = { id: 'user-123' } as User;

      const result = await controller.updateProfile(user, dto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.update).toHaveBeenCalledWith(user.id, dto);
      expect(result).toEqual(mockUserEntity);
    });
  });

  describe('deleteAccount', () => {
    it('Should delegate to UsersService.delete', async () => {
      const user = { id: 'user-123' } as User;

      await controller.deleteAccount(user);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.delete).toHaveBeenCalledWith(user.id);
    });
  });
});

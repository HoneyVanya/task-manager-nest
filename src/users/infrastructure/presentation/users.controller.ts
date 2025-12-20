import {
  Controller,
  Body,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from 'src/users/application/users.service';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/infrastructure/decorators/get-user.decorator';
import { User } from 'src/users/domain/user.entity';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateProfile(@GetUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.id, updateUserDto);
  }

  @Delete('me')
  deleteAccount(@GetUser() user: User) {
    return this.usersService.delete(user.id);
  }
}

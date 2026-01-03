import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { UserRepository } from '../domain/user.repository';
import type { BoardRepository } from 'src/tasks/domain/board.repository';
import type { TransactionManager } from 'src/common/transaction.manager';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../domain/user.entity';
import { Board } from 'src/tasks/domain/board.entity';
import * as bcrypt from 'bcryptjs';
import { Role, BoardType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,

    @Inject('BoardRepository')
    private readonly boardRepository: BoardRepository,

    @Inject('TransactionManager')
    private readonly txManager: TransactionManager,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return await this.txManager.run(async (tx) => {
      const newUser = new User(
        randomUUID(),
        dto.email,
        dto.username,
        hashedPassword,
        Role.USER,
        new Date(),
        new Date(),
      );

      const savedUser = await this.userRepository.save(newUser, tx);

      const newBoard = new Board(
        randomUUID(),
        'My Personal Board',
        BoardType.PRIVATE,
        savedUser.id,
        new Date(),
        new Date(),
      );

      await this.boardRepository.save(newBoard, tx);

      return savedUser;
    });
  }
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.update(dto.email, dto.username);

    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.delete(id);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    return user;
  }
}

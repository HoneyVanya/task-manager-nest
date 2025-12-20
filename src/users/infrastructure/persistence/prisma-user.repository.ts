import { Injectable } from '@nestjs/common';
import { UserRepository, Transaction } from 'src/users/domain/user.repository';
import { User } from 'src/users/domain/user.entity';
import { PrismaService } from 'prisma/prisma.service';
import { UserMapper } from './user.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User, tx?: Transaction): Promise<User> {
    const client = (tx as Prisma.TransactionClient) || this.prisma;

    const data = UserMapper.toPersistance(user);
    const savedUser = await client.user.upsert({
      where: { id: user.id },
      update: data,
      create: data,
    });
    return UserMapper.toDomain(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({ where: { id } });
    if (!raw) return null;
    return UserMapper.toDomain(raw);
  }

  async findByEmail(email: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({ where: { email } });
    if (!raw) return null;
    return UserMapper.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}

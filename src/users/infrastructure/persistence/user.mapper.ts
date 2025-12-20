import { User as PrismaUser } from '@prisma/client';
import { User } from 'src/users/domain/user.entity';

export class UserMapper {
  static toDomain(raw: PrismaUser): User {
    return new User(
      raw.id,
      raw.email,
      raw.username,
      raw.password,
      raw.role,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistance(entity: User): PrismaUser {
    return {
      id: entity.id,
      email: entity.email,
      username: entity.username,
      password: entity.password,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      refreshToken: null,
    };
  }
}

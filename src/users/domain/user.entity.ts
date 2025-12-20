import { Exclude } from 'class-transformer';
import type { Role } from '@prisma/client';

export class User {
  public readonly id: string;
  public email: string;
  public username: string;
  @Exclude()
  public password: string;
  public role: Role;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(
    id: string,
    email: string,
    username: string,
    password: string,
    role: Role,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.password = password;
    this.role = role;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  update(email?: string, username?: string) {
    if (email) this.email = email;
    if (username) this.username = username;
  }
}

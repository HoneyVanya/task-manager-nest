import { User } from './user.entity';

export type Transaction = unknown;

export interface UserRepository {
  save(user: User, tx?: Transaction): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  delete(id: string): Promise<void>;
}

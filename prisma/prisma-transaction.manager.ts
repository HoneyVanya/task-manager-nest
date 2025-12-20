import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionManager } from 'src/common/transaction.manager';

@Injectable()
export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return callback(tx);
    });
  }
}

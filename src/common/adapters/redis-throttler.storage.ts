import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type { RedisClientType } from 'redis';

@Injectable()
export class RedisThrottlerStorage
  implements ThrottlerStorage, OnModuleDestroy
{
  private _scriptSrc: string;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientType) {
    this._scriptSrc = `
      local total = redis.call("INCR", KEYS[1])
      local ttl = redis.call("PTTL", KEYS[1])
      if ttl == -1 then
        redis.call("PEXPIRE", KEYS[1], ARGV[1])
        ttl = ARGV[1]
      end
      return { total, ttl }
    `;
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const result = (await this.redis.eval(this._scriptSrc, {
      keys: [`throttler:${key}`],
      arguments: [ttl.toString()],
    })) as [number, number];

    const [totalHits, timeToExpire] = result;

    return {
      totalHits,
      timeToExpire: timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  onModuleDestroy() {}
}

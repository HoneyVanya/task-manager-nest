import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: Record<string, any>,
  ) {
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details: details ?? {},
        },
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          this.logger.error(`❌ Failed to create audit log: ${err.message}`);
        } else {
          this.logger.error('❌ Failed to create audit log: Unknown error');
        }
      });
  }
}

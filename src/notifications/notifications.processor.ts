import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'welcome-email':
        await this.sendWelcomeEmail(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async sendWelcomeEmail(user: any) {
    this.logger.log(`📧 Sending welcome email to ${user.email}...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.logger.log(`✅ Email sent to ${user.email}`);
  }
}

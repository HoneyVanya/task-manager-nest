import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request } from 'express';
import { User } from 'src/users/domain/user.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const { method, url, user } = req;

    if (method === 'GET' || method === 'HEAD') {
      return next.handle();
    }

    return next.handle().pipe(
      tap((data: unknown) => {
        const hasResourceId =
          data &&
          typeof data === 'object' &&
          'id' in data &&
          typeof (data as { id: unknown }).id === 'string';

        if (user && user.id && hasResourceId) {
          const resourceId = (data as { id: string }).id;
          this.auditService
            .log(user.id, method, 'Resourse', resourceId, { url })
            .catch((err: unknown) => {
              this.logger.error(
                `Failed to log audit for ${method} ${url}`,
                err,
              );
            });
        }
      }),
    );
  }
}

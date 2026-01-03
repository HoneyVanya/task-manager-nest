import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user } = req;

    if (method === 'GET' || method === 'HEAD') {
      return next.handle();
    }

    return next.handle().pipe(
      tap((data) => {
        if (user && user.id && data && data.id) {
          this.auditService.log(user.id, method, 'Resourse', data.id, { url });
        }
      }),
    );
  }
}

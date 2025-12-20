import {
  Catch,
  RpcExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import * as grpc from '@grpc/grpc-js';

@Catch(HttpException)
export class GrpcExceptionFilter implements RpcExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): Observable<any> {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const message = (response as any).message || exception.message;

    let code = grpc.status.UNKNOWN;

    switch (status) {
      case HttpStatus.NOT_FOUND:
        code = grpc.status.NOT_FOUND;
        break;
      case HttpStatus.FORBIDDEN:
        code = grpc.status.PERMISSION_DENIED;
        break;
      case HttpStatus.UNAUTHORIZED:
        code = grpc.status.UNAUTHENTICATED;
        break;
      case HttpStatus.BAD_REQUEST:
        code = grpc.status.INVALID_ARGUMENT;
        break;
      case HttpStatus.CONFLICT:
        code = grpc.status.ALREADY_EXISTS;
        break;
    }

    return throwError(
      () =>
        new RpcException({
          code,
          message,
        }),
    );
  }
}

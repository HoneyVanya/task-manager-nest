import {
  Catch,
  RpcExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import * as grpc from '@grpc/grpc-js';

@Catch(HttpException)
export class GrpcExceptionFilter implements RpcExceptionFilter<HttpException> {
  catch(exception: HttpException): Observable<any> {
    const status = exception.getStatus();
    const response = exception.getResponse();

    let message = exception.message;

    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const msg = (response as { message: unknown }).message;
      if (typeof msg === 'string') {
        message = msg;
      } else if (Array.isArray(msg)) {
        message = msg.join(', ');
      }
    }

    let code = grpc.status.UNKNOWN;

    switch (status as HttpStatus) {
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

import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        const target = exception.meta?.target;

        let targetField = 'field';
        if (Array.isArray(target)) {
          targetField = target.join(', ');
        } else if (typeof target === 'string') {
          targetField = target;
        }

        response.status(status).json({
          statusCode: status,
          message: `Unique constraint failed on the ${targetField}`,
        });
        break;
      }
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          statusCode: status,
          message: exception.message || 'Record not found',
        });
        break;
      }
      default:
        super.catch(exception, host);
        break;
    }
  }
}

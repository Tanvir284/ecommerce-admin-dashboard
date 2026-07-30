import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        errorName = (res as any).error || exception.name;
      } else {
        message = res || exception.message;
        errorName = exception.name;
      }
    } else if (exception?.code === 'P2002') {
      // Prisma duplicate constraint
      status = HttpStatus.CONFLICT;
      const target = exception.meta?.target;
      message = `Conflict error: Record with this ${Array.isArray(target) ? target.join(', ') : 'field'} already exists`;
      errorName = 'ConflictError';
    } else if (exception?.code === 'P2025') {
      // Prisma record not found
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
      errorName = 'NotFoundError';
    } else if (exception?.message) {
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorName,
      message: Array.isArray(message) ? message.join('; ') : message,
      timestamp: new Date().toISOString(),
    });
  }
}

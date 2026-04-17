import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { AppError } from '../common/exceptions/AppError.js';
import { logger } from '../common/utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'Validation Error',
      details: errors,
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: { target?: string[] } };
    
    if (prismaError.code === 'P2002') {
      const target = prismaError.meta?.target?.[0] || 'field';
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        error: `A record with this ${target} already exists`,
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Record not found',
      });
      return;
    }
  }

  // Default error
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};


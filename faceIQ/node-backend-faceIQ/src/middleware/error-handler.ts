/**
 * =============================================================================
 * Error Handler Middleware
 * =============================================================================
 * Global error handling for Express application.
 * =============================================================================
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/index.js';

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

/**
 * Base application error with status code.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request error.
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

/**
 * 404 Not Found error.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * 500 Internal Server error.
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, false);
    this.name = 'InternalError';
  }
}

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

/**
 * Global error handler middleware.
 * Catches all errors and returns consistent JSON response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  if (err instanceof AppError && err.isOperational) {
    logger.warn(`Operational error: ${err.message}`);
  } else {
    logger.error('Unexpected error:', err);
  }

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Build response
  const response: ApiResponse & { stack?: string } = {
    success: false,
    error: err.message || 'An unexpected error occurred',
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.path}`));
}


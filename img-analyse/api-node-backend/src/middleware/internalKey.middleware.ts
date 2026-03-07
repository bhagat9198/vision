/**
 * =============================================================================
 * Internal Key Middleware
 * =============================================================================
 * Validates internal API key for service-to-service communication.
 * Used by img-analyse-backend to fetch configuration.
 * =============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';

/**
 * Validate internal API key from x-internal-key header.
 * Used for service-to-service authentication.
 */
export const validateInternalKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip auth in development if no key is configured
  if (!env.INTERNAL_API_KEY) {
    console.warn('No internal API key configured - skipping auth');
    next();
    return;
  }

  const providedKey = req.headers['x-internal-key'] as string;

  if (!providedKey) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: 'Missing internal API key',
    });
    return;
  }

  if (providedKey !== env.INTERNAL_API_KEY) {
    console.warn('Invalid internal API key provided');
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      error: 'Invalid internal API key',
    });
    return;
  }

  next();
};


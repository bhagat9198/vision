/**
 * =============================================================================
 * Authentication Middleware
 * =============================================================================
 * Validates master API key for admin operations.
 * =============================================================================
 */

import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/index.js';

// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

/**
 * Validate master API key.
 * Used for admin operations like org registration.
 */
export function validateMasterKey(req: Request, res: Response, next: NextFunction): void {
  // Skip auth in development if no key is configured
  if (!env.masterApiKey) {
    logger.warn('No master API key configured - skipping auth');
    next();
    return;
  }

  const providedKey = req.headers['x-master-key'] as string;

  if (!providedKey) {
    res.status(401).json({
      success: false,
      error: 'Missing master API key',
    } as ApiResponse);
    return;
  }

  if (providedKey !== env.masterApiKey) {
    logger.warn('Invalid master API key provided');
    res.status(403).json({
      success: false,
      error: 'Invalid master API key',
    } as ApiResponse);
    return;
  }

  next();
}


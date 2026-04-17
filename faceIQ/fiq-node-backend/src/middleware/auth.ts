/**
 * =============================================================================
 * Authentication Middleware
 * =============================================================================
 * Validates master API key for admin operations.
 * =============================================================================
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-123';

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

/**
 * Verify JWT token or Master Key.
 * Allows access if either a valid Master Key is provided OR a valid User Token.
 */
export function verifyAuth(req: Request, res: Response, next: NextFunction): void {
  // 1. Check for Master Key first
  const masterKey = req.headers['x-master-key'] as string;
  if (masterKey && masterKey === env.masterApiKey) {
    (req as any).user = { role: 'admin', type: 'master' };
    return next();
  }

  // 2. Check for Auth Token
  const token = req.headers['x-auth-token'] as string;
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing master key or auth token',
    } as ApiResponse);
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token',
    } as ApiResponse);
  }
}


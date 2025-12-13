/**
 * =============================================================================
 * Organization Authentication Middleware
 * =============================================================================
 * Handles API key authentication and org settings injection.
 * =============================================================================
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { toOrgSettings, type OrgSettings } from '../modules/org/org.types.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-123';

// =============================================================================
// TYPES
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      orgSettings?: OrgSettings;
      orgId?: string;
    }
  }
}

// =============================================================================
// CACHE KEYS
// =============================================================================

const API_KEY_CACHE_PREFIX = 'api_key:';
const API_KEY_CACHE_TTL = 300; // 5 minutes

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Require MASTER_API_KEY for registration endpoints.
 */
export async function requireMasterKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-master-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'Master API key required. Set x-master-key header.',
    });
    return;
  }

  if (apiKey !== env.masterApiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid master API key',
    });
    return;
  }

  next();
}

/**
 * Require valid org API key for protected endpoints.
 * Injects orgSettings into request.
 */
export async function requireOrgAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  const authToken = req.headers['x-auth-token'] as string;

  // 1. Check for Auth Token first
  if (authToken) {
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET);
      (req as any).user = decoded;
      // For admin access via token, we might not set orgSettings/orgId strictly
      // But we allow proceed. Controller logic might need to handle missing orgSettings if it relied on it.
      // However, for GET /orgs/:id, we just want to fetch the org.
      next();
      return;
    } catch (error) {
      // If token is invalid, we fall through to check API key? 
      // Or stricter: if token provided but invalid -> 401?
      // User said "either one is required". If token is present but bad, it's bad auth.
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid token',
      });
      return;
    }
  }

  // 2. If no token, Check for API Key
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Provide x-auth-token OR x-api-key.',
    });
    return;
  }

  try {
    // Check Redis cache first
    const cacheKey = `${API_KEY_CACHE_PREFIX}${apiKey}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const orgSettings = JSON.parse(cached) as OrgSettings;
      req.orgSettings = orgSettings;
      req.orgId = orgSettings.orgId;
      next();
      return;
    }

    // Lookup in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { org: true },
    });

    if (!apiKeyRecord) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
      return;
    }

    // Check if key is active
    if (!apiKeyRecord.isActive) {
      res.status(401).json({
        success: false,
        error: 'API key has been revoked',
      });
      return;
    }

    // Check if key is expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: 'API key has expired',
      });
      return;
    }

    // Check if org is active
    if (!apiKeyRecord.org.isActive) {
      res.status(403).json({
        success: false,
        error: 'Organization has been deactivated',
      });
      return;
    }

    // Convert to OrgSettings and cache
    const orgSettings = toOrgSettings(apiKeyRecord.org);
    await redisClient.setex(cacheKey, API_KEY_CACHE_TTL, JSON.stringify(orgSettings));

    req.orgSettings = orgSettings;
    req.orgId = orgSettings.orgId;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Validate that org has required settings configured.
 */
export function requireOrgSettings(...requiredFields: (keyof OrgSettings)[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.orgSettings) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const missing = requiredFields.filter((field) => !req.orgSettings![field]);

    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `Organization missing required settings: ${missing.join(', ')}. Please configure via PATCH /orgs/${req.orgId}/settings`,
      });
      return;
    }

    next();
  };
}


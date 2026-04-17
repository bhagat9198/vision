/**
 * =============================================================================
 * API Key Controller
 * =============================================================================
 * HTTP handlers for API key management.
 * =============================================================================
 */

import type { Request, Response } from 'express';
import { apiKeyService } from './api-key.service.js';
import { logger } from '../../utils/logger.js';

// =============================================================================
// CONTROLLERS
// =============================================================================

/**
 * POST /orgs/:orgId/api-keys
 * Create a new API key.
 */
export async function createApiKey(req: Request, res: Response) {
  try {
    const orgId = req.params.orgId as string;
    const { name, expiresAt } = req.body;

    // Verify the requesting org matches
    if (req.orgId !== orgId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create API keys for this organization',
      });
    }

    const apiKey = await apiKeyService.create(
      orgId,
      name || 'Default',
      expiresAt ? new Date(expiresAt) : undefined
    );

    return res.status(201).json({
      success: true,
      data: apiKey,
      message: 'API key created. Save the key securely - it will not be shown again!',
    });
  } catch (error) {
    logger.error('Failed to create API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create API key',
    });
  }
}

/**
 * GET /orgs/:orgId/api-keys
 * List all API keys for an organization.
 */
export async function listApiKeys(req: Request, res: Response) {
  try {
    const orgId = req.params.orgId as string;

    if (req.orgId !== orgId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view API keys for this organization',
      });
    }

    const keys = await apiKeyService.listByOrg(orgId);

    return res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    logger.error('Failed to list API keys:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
    });
  }
}

/**
 * DELETE /orgs/:orgId/api-keys/:keyId
 * Revoke an API key.
 */
export async function revokeApiKey(req: Request, res: Response) {
  try {
    const orgId = req.params.orgId as string;
    const keyId = req.params.keyId as string;

    if (req.orgId !== orgId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to revoke API keys for this organization',
      });
    }

    // Verify key belongs to org
    const existing = await apiKeyService.getById(keyId, orgId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
      });
    }

    await apiKeyService.revoke(keyId);

    return res.json({
      success: true,
      message: 'API key revoked',
    });
  } catch (error) {
    logger.error('Failed to revoke API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
    });
  }
}


/**
 * =============================================================================
 * Organization Controller
 * =============================================================================
 * HTTP handlers for organization management.
 * =============================================================================
 */

import type { Request, Response } from 'express';
import { orgService } from './org.service.js';
import { logger } from '../../utils/logger.js';
import type { Organization } from '../../../generated/prisma/client.js';

// =============================================================================
// CONTROLLERS
// =============================================================================

/**
 * POST /orgs/register
 * Register a new organization (requires MASTER_API_KEY).
 */
export async function registerOrg(req: Request, res: Response) {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required (min 2 characters)',
      });
    }

    const result = await orgService.register({ name: name.trim() });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Organization registered successfully. Save your API key securely!',
    });
  } catch (error) {
    logger.error('Failed to register organization:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register organization',
    });
  }
}

/**
 * GET /orgs/:id
 * Get organization details.
 */
export async function getOrg(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const org = await orgService.getById(id);

    if (!org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Don't expose sensitive keys in response
    const safeOrg = {
      ...org,
      comprefaceRecognitionApiKey: org.comprefaceRecognitionApiKey ? '***' : null,
      comprefaceDetectionApiKey: org.comprefaceDetectionApiKey ? '***' : null,
    };

    return res.json({
      success: true,
      data: safeOrg,
    });
  } catch (error) {
    logger.error('Failed to get organization:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get organization',
    });
  }
}

/**
 * PATCH /orgs/:id/settings
 * Update organization settings.
 */
export async function updateOrgSettings(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const settings = req.body;

    // Verify org exists
    const existing = await orgService.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const updated = await orgService.updateSettings(id, settings);

    // Don't expose sensitive keys in response
    const safeOrg = {
      ...updated,
      comprefaceRecognitionApiKey: updated.comprefaceRecognitionApiKey ? '***' : null,
      comprefaceDetectionApiKey: updated.comprefaceDetectionApiKey ? '***' : null,
    };

    return res.json({
      success: true,
      data: safeOrg,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update organization settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
}

/**
 * DELETE /orgs/:id
 * Deactivate organization.
 */
export async function deactivateOrg(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const existing = await orgService.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    await orgService.deactivate(id);

    return res.json({
      success: true,
      message: 'Organization deactivated',
    });
  } catch (error) {
    logger.error('Failed to deactivate organization:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate organization',
    });
  }
}

/**
 * GET /orgs
 * List all organizations (admin only).
 */
export async function listOrgs(req: Request, res: Response) {
  try {
    const orgs = await orgService.listAll();

    return res.json({
      success: true,
      data: orgs.map((org: Organization) => ({
        id: org.id,
        name: org.name,
        isActive: org.isActive,
        createdAt: org.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to list organizations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list organizations',
    });
  }
}


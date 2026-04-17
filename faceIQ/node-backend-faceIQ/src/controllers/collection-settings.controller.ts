/**
 * =============================================================================
 * Collection Settings Controller
 * =============================================================================
 * HTTP handlers for collection settings endpoints
 * =============================================================================
 */

import type { Request, Response } from 'express';
import * as collectionSettingsService from '../services/collection-settings.service.js';
import { logger } from '../utils/logger.js';

/**
 * GET /collections/:collectionName/settings
 * Get settings for a specific collection
 */
export async function getSettings(req: Request, res: Response) {
    try {
        const collectionName = decodeURIComponent(req.params.collectionName);

        const settings = await collectionSettingsService.getSettings(collectionName);

        return res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        logger.error('Failed to get collection settings:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get collection settings',
        });
    }
}

/**
 * PUT /collections/:collectionName/settings
 * Create or update settings for a collection
 */
export async function updateSettings(req: Request, res: Response) {
    try {
        const collectionName = decodeURIComponent(req.params.collectionName);
        const data = req.body;

        const settings = await collectionSettingsService.upsertSettings(collectionName, data);

        return res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        logger.error('Failed to update collection settings:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update collection settings',
        });
    }
}

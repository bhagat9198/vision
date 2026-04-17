/**
 * =============================================================================
 * Global Settings Controller
 * =============================================================================
 * HTTP handlers for global settings endpoints.
 * =============================================================================
 */

import type { Request, Response } from 'express';
import { globalSettingsService } from './global-settings.service.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /settings/global
 * Get global default settings
 */
export async function getGlobalSettings(req: Request, res: Response): Promise<void> {
    try {
        const settings = await globalSettingsService.getGlobalSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        logger.error('Failed to get global settings', { error });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get global settings',
        });
    }
}

/**
 * PUT /settings/global
 * Update global default settings
 */
export async function updateGlobalSettings(req: Request, res: Response): Promise<void> {
    try {
        const updates = req.body;
        const settings = await globalSettingsService.updateGlobalSettings(updates);
        res.json({ success: true, data: settings });
    } catch (error) {
        logger.error('Failed to update global settings', { error });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update global settings',
        });
    }
}

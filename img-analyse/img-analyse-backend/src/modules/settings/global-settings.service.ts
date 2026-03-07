/**
 * =============================================================================
 * Global Settings Service
 * =============================================================================
 * Manages system-wide default settings for organizations.
 * Singleton pattern - only one row should exist in the database.
 * =============================================================================
 */

import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import type { GlobalSettings } from '@prisma/client';

export class GlobalSettingsService {
    /**
     * Get global settings (creates default if none exist)
     */
    async getGlobalSettings(): Promise<GlobalSettings> {
        let settings = await prisma.globalSettings.findFirst();

        if (!settings) {
            logger.info('No global settings found, creating default settings');
            settings = await prisma.globalSettings.create({
                data: {},
            });
        }

        return settings;
    }

    /**
     * Update global settings
     */
    async updateGlobalSettings(updates: Partial<GlobalSettings>): Promise<GlobalSettings> {
        const settings = await this.getGlobalSettings();

        const updated = await prisma.globalSettings.update({
            where: { id: settings.id },
            data: updates,
        });

        logger.info('Global settings updated', { updates });
        return updated;
    }
}

export const globalSettingsService = new GlobalSettingsService();

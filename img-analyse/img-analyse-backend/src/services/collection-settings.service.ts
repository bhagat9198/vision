/**
 * =============================================================================
 * Collection Settings Service
 * =============================================================================
 * Manages per-collection settings (auto-clustering, auto-indexing, etc.)
 * =============================================================================
 */

import { prisma } from '../config/database.js';
import type { CollectionSettings } from '../../generated/prisma/index.js';
import { logger } from '../utils/logger.js';

export interface CollectionSettingsData {
    autoClustering?: boolean;
    autoIndexing?: boolean;
    notifyOnCompletion?: boolean;
}

/**
 * Get settings for a collection (returns defaults if not found)
 */
export async function getSettings(collectionName: string): Promise<CollectionSettings> {
    const existing = await prisma.collectionSettings.findUnique({
        where: { collectionName },
    });

    if (existing) {
        return existing;
    }

    // Return defaults if no settings exist
    // Extract orgId and eventId from collection name
    const orgMatch = collectionName.match(/^org_([^_]+)_/);
    const eventMatch = collectionName.match(/event_([^_]+)_faces/);

    return {
        id: '',
        collectionName,
        orgId: orgMatch ? orgMatch[1] : '',
        eventId: eventMatch ? eventMatch[1] : '',
        autoClustering: false,
        autoIndexing: true,
        notifyOnCompletion: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * Create or update settings for a collection
 */
export async function upsertSettings(
    collectionName: string,
    data: CollectionSettingsData
): Promise<CollectionSettings> {
    // Extract orgId and eventId from collection name
    const orgMatch = collectionName.match(/^org_([^_]+)_/);
    const eventMatch = collectionName.match(/event_([^_]+)_faces/);

    const orgId = orgMatch?.[1] || 'unknown';
    const eventId = eventMatch?.[1] || 'unknown';

    return prisma.collectionSettings.upsert({
        where: { collectionName },
        create: {
            collectionName,
            orgId,
            eventId,
            ...data,
        },
        update: data,
    });
}

/**
 * Delete settings for a collection
 */
export async function deleteSettings(collectionName: string): Promise<void> {
    await prisma.collectionSettings.delete({
        where: { collectionName },
    });
}

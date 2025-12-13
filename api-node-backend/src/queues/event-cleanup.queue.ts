import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { logger } from '../common/utils/logger.js';
import { storageService } from '../services/storage.service.js';
import { configService } from '../modules/config/config.service.js';
import { faceAnalysisClient } from '../services/face-analysis.client.js';
import path from 'path';

export const EVENT_CLEANUP_QUEUE_NAME = 'event-cleanup';

export interface EventCleanupJobData {
    orgId: string;
    photographerId: string;
    eventId: string;
    eventUuid?: string; // Add UUID for services that rely on it (like Qdrant)
    eventSlug?: string; // Add Slug for services that rely on it (like Qdrant now)
    deletionMode: 'soft' | 'hard';
    trashPath: string;
}

export const eventCleanupQueue = new Queue(EVENT_CLEANUP_QUEUE_NAME, {
    connection: getRedisConnection(),
});

const processEventCleanup = async (job: Job<EventCleanupJobData>) => {
    const { orgId, photographerId, eventId, deletionMode, trashPath, eventSlug } = job.data;

    logger.info(`[EventCleanup] Processing cleanup for event ${eventId} in mode ${deletionMode}`);

    // 1. Construct Event Path
    // Path structure: [OrgID]/[PhotographerID]/[EventID]
    const eventPath = path.join(orgId, photographerId, eventId);

    try {
        // Check if directory exists
        const exists = await storageService.checkExists(eventPath);
        if (!exists) {
            logger.warn(`[EventCleanup] Event path does not exist: ${eventPath}`);
            // Proceed to cleanup face data anyway
        } else {
            // 2. Perform File Operation
            if (deletionMode === 'soft') {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const destPath = path.join(trashPath, orgId, photographerId, `${eventId}_${timestamp}`);

                logger.info(`[EventCleanup] Soft deleting (moving) ${eventPath} to ${destPath}`);
                await storageService.moveDirectory(eventPath, destPath);
            } else {
                logger.info(`[EventCleanup] Hard deleting ${eventPath}`);
                await storageService.deleteDirectory(eventPath);
            }
        }

        // 3. Cleanup Face Analysis Data
        // We assume Face Analysis stores data by EventID collection
        if (faceAnalysisClient) {
            // Use UUID if available, otherwise fallback to eventId (which might be displayId)
            const targetId = job.data.eventUuid || eventId;
            logger.info(`[EventCleanup] Deleting face analysis collection for event ${targetId} (slug: ${eventSlug || 'N/A'})`);

            // Note: configService.getOrgApiKey(orgId) usage might be needed if sidecar requires it
            // But current FaceAnalysisClient uses global key or needs refactoring.
            // We'll use the method we have.
            await faceAnalysisClient.deleteEvent(targetId, eventSlug);
        }

        logger.info(`[EventCleanup] Cleanup completed for event ${eventId}`);
    } catch (error) {
        logger.error(`[EventCleanup] Failed to cleanup event ${eventId}`, error);
        throw error;
    }
};

export const eventCleanupWorker = new Worker(EVENT_CLEANUP_QUEUE_NAME, processEventCleanup, {
    connection: getRedisConnection(),
    concurrency: 5,
});

eventCleanupWorker.on('completed', (job) => {
    logger.info(`[EventCleanup] Job ${job.id} completed`);
});

eventCleanupWorker.on('failed', (job, err) => {
    logger.error(`[EventCleanup] Job ${job?.id} failed`, err);
});

/**
 * =============================================================================
 * Face Indexing Queue
 * =============================================================================
 * Handles background processing of photos for face detection and indexing.
 * =============================================================================
 */

import { Queue, Worker, type Job } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { faceDetectionService } from '../services/face-detection.service.js';
import { qdrantService } from '../services/qdrant.service.js';
import { fetchImageFromUrl, readImageFromPath } from '../utils/image-utils.js';
import type { OrgSettings } from '../modules/org/org.types.js'; // Assuming this import path is correct based on other files
import { prisma } from '../config/database.js';

// Connection config
const connection = {
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword,
};

export const QUEUE_NAME = 'face-indexing';

// Create Queue
export const faceIndexingQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
    },
});

export interface FaceIndexingJobData {
    photoId: string;
    eventId: string;
    eventSlug?: string;
    imageUrl?: string;
    imagePath?: string;
    orgSettings: OrgSettings;
}

// Create Worker
const worker = new Worker<FaceIndexingJobData>(
    QUEUE_NAME,
    async (job: Job<FaceIndexingJobData>) => {
        const startTime = Date.now();
        const { photoId, eventId, imageUrl, imagePath, orgSettings } = job.data;

        logger.info(`Processing indexing job for photo ${photoId} (Event: ${eventId})`);

        try {
            // Update status to PROCESSING (from PENDING)
            await prisma.eventImageStatus.update({
                where: { eventId_photoId: { eventId, photoId } },
                data: { status: 'PROCESSING' }
            }).catch(e => logger.warn(`Could not update status to PROCESSING: ${e.message}`));

            // 1. Get image buffer
            let imageBuffer: Buffer;

            if (imageUrl) {
                imageBuffer = await fetchImageFromUrl(imageUrl);
            } else if (imagePath) {
                // If shared storage path is set AND path is relative, join them.
                // Otherwise treat as absolute path.
                let fullPath = imagePath;
                if (orgSettings.sharedStoragePath && !imagePath.startsWith('/')) {
                    fullPath = `${orgSettings.sharedStoragePath}/${imagePath}`;
                }

                logger.debug(`Reading image from path: ${fullPath}`);
                imageBuffer = await readImageFromPath(fullPath);
            } else {
                throw new Error('No valid image source provided in job data');
            }

            // 2. Detect & Embed
            const { faces, detectionResult } = await faceDetectionService.detectAndEmbed(orgSettings, imageBuffer);

            // Index faces in Qdrant
            const pointIds = await qdrantService.indexFaces(
                job.data.orgSettings.slug,
                job.data.eventSlug || job.data.eventId, // Use slug if available
                job.data.photoId,
                faces,
                { eventId: job.data.eventId }
            );

            // 4. Reporting
            const duration = Date.now() - startTime;
            logger.info(
                `Indexed photo ${photoId}: ${pointIds.length} faces, ` +
                `${detectionResult.rejectedCount} rejected in ${duration}ms`
            );

            // UPDATE STATUS IN DB
            await prisma.eventImageStatus.update({
                where: { eventId_photoId: { eventId, photoId } },
                data: {
                    status: 'COMPLETED',
                    facesDetected: faces.length,
                    facesIndexed: pointIds.length,
                    error: null,
                }
            });

            return {
                processed: true,
                facesFound: faces.length,
                facesIndexed: pointIds.length,
                duration,
            };
        } catch (error: any) {
            console.error(error); // Keep full stack
            logger.error(`Failed to process indexing job for photo ${photoId}:`, error);

            // UPDATE STATUS TO FAILED
            await prisma.eventImageStatus.update({
                where: { eventId_photoId: { eventId, photoId } },
                data: {
                    status: 'FAILED',
                    error: error.message || 'Unknown error',
                }
            }).catch(e => logger.error('Failed to update error status:', e));

            throw error;
        }
    },
    {
        connection,
        concurrency: 2, // Reduced from 5 to 2 to prevent OOM
    }
);

// Worker events
worker.on('completed', (job: Job) => {
    logger.debug(`Job ${job.id} completed`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
});

/**
 * Add a photo to the indexing queue.
 */
export const addToIndexingQueue = async (data: FaceIndexingJobData) => {
    return faceIndexingQueue.add('index-photo', data);
};

// Graceful shutdown
export const closeQueue = async () => {
    await faceIndexingQueue.close();
    await worker.close();
};

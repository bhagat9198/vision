/**
 * =============================================================================
 * Video Processing Queue
 * =============================================================================
 * Handles long-running video processing:
 * 1. Extract frames from video
 * 2. Create EventImageStatus records for each frame
 * 3. Dispatch to FaceIndexingQueue
 * =============================================================================
 */

import { Queue, Worker, type Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { videoProcessorService } from '../services/video-processor.service.js';
import { addToIndexingQueue } from './face-indexing.queue.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// Default frames storage directory (used when sharedStoragePath is not configured)
const DEFAULT_FRAMES_DIR = path.resolve(process.cwd(), 'data', 'frames');

// Connection config
const connection = {
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword,
};

export const VIDEO_QUEUE_NAME = 'video-processing';

// Create Queue
export const videoProcessingQueue = new Queue(VIDEO_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 1, // Fail fast on video errors, or retry? Video is heavy. 1 attempt for now.
        removeOnComplete: 1000,
        removeOnFail: 5000,
    },
});

interface VideoJobData {
    videoId: string;
    eventId: string;
    eventSlug?: string;
    videoPath: string; // Path in shared storage or temp
    orgSettings: OrgSettings;
}

// Create Worker
const worker = new Worker<VideoJobData>(
    VIDEO_QUEUE_NAME,
    async (job: Job<VideoJobData>) => {
        const { videoId, eventId, eventSlug, videoPath, orgSettings } = job.data;
        logger.info(`Processing video ${videoId} (Event: ${eventId})`);

        try {
            // Update status to PROCESSING and get the PK
            const videoStatus = await prisma.eventVideoStatus.update({
                where: { eventId_videoId: { eventId, videoId } },
                data: { status: 'PROCESSING' }
            });

            // 1. Get Metadata
            const isUrl = videoPath.startsWith('http://') || videoPath.startsWith('https://');
            const fullPath = (orgSettings.sharedStoragePath && !isUrl)
                ? `${orgSettings.sharedStoragePath}/${videoPath}`
                : videoPath; // Fallback if absolute path provided or if it's a URL

            const metadata = await videoProcessorService.getMetadata(fullPath);

            // 2. Extract Frames (1 frame per second)
            const frames = await videoProcessorService.extractFrames(fullPath, 1.0);
            logger.info(`Extracted ${frames.length} frames from video ${videoId}`);

            // 3. Create DB Records & Dispatch Jobs
            let scheduledCount = 0;

            for (const frame of frames) {
                const photoId = uuidv4();

                // Create Image Status Record
                await prisma.eventImageStatus.create({
                    data: {
                        eventId,
                        photoId,
                        eventSlug: eventSlug || null,
                        orgId: orgSettings.orgId,
                        status: 'PENDING',
                        sourceVideoId: videoStatus.id,
                        videoTimestamp: frame.timestamp,
                        imageUrl: null, // Will be updated after copying to permanent storage
                    }
                });

                // Copy frame to permanent storage before queuing
                // This prevents race condition where temp frames are deleted before indexing completes
                const relDir = `frames/${videoId}`;
                const baseDir = orgSettings.sharedStoragePath || DEFAULT_FRAMES_DIR;
                const destDir = path.join(baseDir, relDir);
                const destFile = path.join(destDir, `${photoId}.jpg`);

                await fs.promises.mkdir(destDir, { recursive: true });
                await fs.promises.copyFile(frame.path, destFile);

                // For indexing queue: use relative path if sharedStoragePath is set,
                // otherwise use absolute path
                const jobImagePath = orgSettings.sharedStoragePath
                    ? `${relDir}/${photoId}.jpg`  // Relative path
                    : destFile;                    // Absolute path

                // Update EventImageStatus with the frame's image URL/path
                await prisma.eventImageStatus.update({
                    where: { eventId_photoId: { eventId, photoId } },
                    data: { imageUrl: destFile }
                });

                await addToIndexingQueue({
                    photoId,
                    eventId,
                    eventSlug,
                    orgSettings,
                    imagePath: jobImagePath,
                    imageUrl: undefined
                });

                scheduledCount++;
            }

            // Cleanup temp frames (safe now since we copied to permanent storage)
            await videoProcessorService.cleanupFrames(frames);

            // Update Video Status
            await prisma.eventVideoStatus.update({
                where: { eventId_videoId: { eventId, videoId } },
                data: {
                    status: 'COMPLETED',
                    durationSec: metadata.duration,
                    framesExtracted: scheduledCount,
                }
            });

            logger.info(`Video ${videoId} processed: ${scheduledCount} frames scheduled`);

            return {
                processed: true,
                frames: scheduledCount,
                duration: metadata.duration
            };

        } catch (error: any) {
            logger.error(`Failed to process video ${videoId}:`, error);

            await prisma.eventVideoStatus.update({
                where: { eventId_videoId: { eventId, videoId } },
                data: {
                    status: 'FAILED',
                    error: error.message || 'Unknown error'
                }
            });
            throw error;
        }
    },
    {
        connection,
        concurrency: 1, // Sequential video processing
    }
);

export const addToVideoQueue = async (data: VideoJobData) => {
    return videoProcessingQueue.add('process-video', data);
};

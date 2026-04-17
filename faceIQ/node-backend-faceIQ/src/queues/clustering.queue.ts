/**
 * =============================================================================
 * Face Clustering Queue
 * =============================================================================
 * Handles background processing of face clustering jobs.
 * Triggered manually via API - clusters all faces in an event into person groups.
 * =============================================================================
 */

import { Queue, Worker, type Job } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { faceClusteringService, type ClusteringResult } from '../services/face-clustering.service.js';
import { qdrantService } from '../services/qdrant.service.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// Connection config
const connection = {
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
};

export const QUEUE_NAME = 'face-clustering';

// Create Queue
export const faceClusteringQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export interface ClusteringJobData {
  jobId: string;          // DB ClusteringJob ID
  eventId: string;
  eventSlug: string;
  orgSettings: OrgSettings;
}

// Create Worker
const worker = new Worker<ClusteringJobData>(
  QUEUE_NAME,
  async (job: Job<ClusteringJobData>) => {
    const startTime = Date.now();
    const { jobId, eventId, eventSlug, orgSettings } = job.data;

    logger.info(`[CLUSTERING_QUEUE] Starting job ${jobId} for event ${eventSlug}`);

    try {
      // Update job status to RUNNING
      await prisma.clusteringJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      // Run clustering
      const result = await faceClusteringService.clusterEvent(
        orgSettings,
        eventSlug,
        eventId
      );

      // Save clusters to database
      await saveClustersToDatabase(orgSettings, eventId, eventSlug, result);

      // Update job status to COMPLETED
      await prisma.clusteringJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalFaces: result.totalFaces,
          clustersFound: result.numClusters,
          noiseFaces: result.noiseFaces,
        },
      });

      const duration = Date.now() - startTime;
      logger.info(
        `[CLUSTERING_QUEUE] Job ${jobId} completed: ${result.numClusters} clusters, ` +
        `${result.noiseFaces} noise in ${duration}ms`
      );

      return {
        success: true,
        numClusters: result.numClusters,
        totalFaces: result.totalFaces,
        duration,
      };
    } catch (error: any) {
      logger.error(`[CLUSTERING_QUEUE] Job ${jobId} failed:`, error);

      // Update job status to FAILED
      await prisma.clusteringJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: error.message || 'Unknown error',
        },
      }).catch(e => logger.error('Failed to update job status:', e));

      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Only one clustering job at a time
  }
);

// Worker events
worker.on('completed', (job: Job) => {
  logger.debug(`[CLUSTERING_QUEUE] Job ${job.id} completed`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[CLUSTERING_QUEUE] Job ${job?.id} failed: ${err.message}`);
});

/**
 * Save clustering results to database.
 * Creates PersonCluster and FaceClusterAssignment records.
 */
async function saveClustersToDatabase(
  orgSettings: OrgSettings,
  eventId: string,
  eventSlug: string,
  result: ClusteringResult
): Promise<void> {
  const orgId = orgSettings.orgId;

  logger.info(`[CLUSTERING_QUEUE] Saving ${result.numClusters} clusters to database`);

  // Delete existing clusters for this event (re-clustering)
  await prisma.faceClusterAssignment.deleteMany({
    where: { orgId, eventId },
  });
  await prisma.personCluster.deleteMany({
    where: { orgId, eventId },
  });

  // Create clusters and assignments
  let clusterIndex = 1;

  for (const [clusterId, pointIds] of result.clusters) {
    // Get photo IDs for this cluster
    const points = await qdrantService.getPointsByIds(orgSettings.slug, eventSlug, pointIds);
    const photoIds = new Set(points.map(p => p.payload.photoId));

    // Select representative face (first one for now - could improve with quality scoring)
    const representativeFaceId = pointIds[0];

    // Debug: Log cluster composition for debugging accuracy issues
    logger.debug(
      `[CLUSTERING_QUEUE] Cluster ${clusterIndex} (internal: ${clusterId}): ` +
      `${pointIds.length} faces from ${photoIds.size} photos. ` +
      `Face IDs: [${pointIds.slice(0, 5).map(id => id.slice(0, 8)).join(', ')}${pointIds.length > 5 ? '...' : ''}]`
    );

    // Create the cluster
    const cluster = await prisma.personCluster.create({
      data: {
        orgId,
        eventId,
        eventSlug,
        name: `Person ${clusterIndex}`,
        displayOrder: clusterIndex,
        representativeFaceId,
        faceCount: pointIds.length,
        photoCount: photoIds.size,
        isNoise: false,
      },
    });

    // Create face assignments with detailed logging
    const assignments = points.map(point => ({
      orgId,
      eventId,
      qdrantPointId: point.id,
      photoId: point.payload.photoId,
      clusterId: cluster.id,
      confidence: 1.0,
      isManual: false,
    }));

    await prisma.faceClusterAssignment.createMany({
      data: assignments,
    });

    // Log the photo -> cluster mapping for easier debugging
    logger.info(
      `[CLUSTERING_QUEUE] Created Person ${clusterIndex} (${cluster.id}): ` +
      `${pointIds.length} faces, ${photoIds.size} unique photos`
    );

    clusterIndex++;
  }

  // Create noise cluster if there are unclustered faces
  if (result.noisePointIds.length > 0) {
    const noisePoints = await qdrantService.getPointsByIds(
      orgSettings.slug,
      eventSlug,
      result.noisePointIds
    );
    const noisePhotoIds = new Set(noisePoints.map(p => p.payload.photoId));

    const noiseCluster = await prisma.personCluster.create({
      data: {
        orgId,
        eventId,
        eventSlug,
        name: 'Unclustered',
        displayOrder: 9999,
        faceCount: result.noisePointIds.length,
        photoCount: noisePhotoIds.size,
        isNoise: true,
      },
    });

    const noiseAssignments = noisePoints.map(point => ({
      orgId,
      eventId,
      qdrantPointId: point.id,
      photoId: point.payload.photoId,
      clusterId: noiseCluster.id,
      confidence: 0,
      isManual: false,
    }));

    await prisma.faceClusterAssignment.createMany({
      data: noiseAssignments,
    });
  }

  logger.info(`[CLUSTERING_QUEUE] Saved ${clusterIndex - 1} clusters to database`);
}

/**
 * Add a clustering job to the queue.
 */
export const addToClusteringQueue = async (data: ClusteringJobData) => {
  return faceClusteringQueue.add('cluster-event', data);
};

// Graceful shutdown
export const closeClusteringQueue = async () => {
  await faceClusteringQueue.close();
  await worker.close();
};


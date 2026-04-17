import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { logger } from '../common/utils/logger.js';
import { imageProcessor } from '../services/image-processor.service.js';

// Queue name
export const IMAGE_PROCESSING_QUEUE = 'image-processing';

// Job types
export interface ImageProcessingJobData {
  sessionId: string;
  fileId: string;
  photographerId: string;
  eventId: string;
  albumId: string;
  originalName: string;
  mimeType: string;
}

// Create the queue
let imageProcessingQueue: Queue<ImageProcessingJobData> | null = null;

export const getImageProcessingQueue = () => {
  if (!imageProcessingQueue) {
    imageProcessingQueue = new Queue<ImageProcessingJobData>(IMAGE_PROCESSING_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs for debugging
        },
      },
    });
  }
  return imageProcessingQueue;
};

// Add a job to the queue
export const addImageProcessingJob = async (data: ImageProcessingJobData) => {
  const queue = getImageProcessingQueue();
  const job = await queue.add('process-image', data, {
    jobId: `${data.sessionId}-${data.fileId}`, // Prevent duplicate jobs
  });
  logger.info(`Added image processing job: ${job.id}`);
  return job;
};

// Create the worker
let imageProcessingWorker: Worker<ImageProcessingJobData> | null = null;

export const startImageProcessingWorker = (concurrency: number = 5) => {
  if (imageProcessingWorker) {
    logger.warn('Image processing worker already running');
    return imageProcessingWorker;
  }

  imageProcessingWorker = new Worker<ImageProcessingJobData>(
    IMAGE_PROCESSING_QUEUE,
    async (job: Job<ImageProcessingJobData>) => {
      logger.info(`Processing job ${job.id}: ${job.data.originalName}`);
      
      try {
        const result = await imageProcessor.processUploadedFile(job.data);
        logger.info(`Completed job ${job.id}: ${job.data.originalName}`);
        return result;
      } catch (error) {
        logger.error(`Failed job ${job.id}: ${job.data.originalName}`, error);
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency,
    }
  );

  // Event handlers
  imageProcessingWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  imageProcessingWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  imageProcessingWorker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  logger.info(`Image processing worker started with concurrency: ${concurrency}`);
  return imageProcessingWorker;
};

export const stopImageProcessingWorker = async () => {
  if (imageProcessingWorker) {
    await imageProcessingWorker.close();
    imageProcessingWorker = null;
    logger.info('Image processing worker stopped');
  }
};

// Get queue stats
export const getQueueStats = async () => {
  const queue = getImageProcessingQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  
  return { waiting, active, completed, failed, delayed };
};


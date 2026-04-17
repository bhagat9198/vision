import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/utils/logger.js';
import { prisma } from './config/database.js';
import { getRedisConnection, closeRedisConnection } from './config/redis.js';
import express from 'express';
import path from 'path';
import { configService } from './modules/config/config.service.js';
import { startImageProcessingWorker, stopImageProcessingWorker } from './queues/image-processing.queue.js';
import './queues/event-cleanup.queue.js'; // Initialize cleanup worker
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Initialize Redis connection
    const redis = getRedisConnection();
    await redis.ping();
    logger.info('✅ Redis connected successfully');

    // Start image processing worker
    startImageProcessingWorker(5); // 5 concurrent jobs
    logger.info('✅ Image processing worker started');

    // Start server
    // Serve static files from configured, absolute path
    const storageConfig = await configService.getStorageConfig();
    if (storageConfig.local.path) {
      const absoluteStoragePath = path.resolve(storageConfig.local.path);
      app.use('/uploads', express.static(absoluteStoragePath));
      logger.info(`📂 Serving static files from: ${absoluteStoragePath}`);
    }

    // Register error handlers (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);

    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${env.PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`\n${signal} received. Shutting down gracefully...`);

  try {
    // Stop image processing worker
    await stopImageProcessingWorker();
    logger.info('Image processing worker stopped');

    // Close Redis connection
    await closeRedisConnection();
    logger.info('Redis disconnected');

    // Disconnect database
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();


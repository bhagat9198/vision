/**
 * =============================================================================
 * Server Entry Point
 * =============================================================================
 * Starts the Express server and initializes connections.
 * =============================================================================
 */

import { createApp } from './app.js';
import { env, connectRedis, disconnectRedis, checkQdrantHealth } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

// =============================================================================
// STARTUP
// =============================================================================

async function startServer(): Promise<void> {
  logger.info('Starting img-analyse-backend...');
  logger.info(`Environment: ${env.nodeEnv}`);

  try {
    // Initialize Database connection
    logger.info('Connecting to PostgreSQL...');
    await connectDatabase();

    // Initialize Redis connection
    logger.info('Connecting to Redis...');
    await connectRedis();

    // Check Qdrant connection
    logger.info('Checking Qdrant connection...');
    const qdrantHealth = await checkQdrantHealth();
    if (qdrantHealth.status === 'up') {
      logger.info(`Qdrant connected (${qdrantHealth.responseTimeMs}ms)`);
    } else {
      logger.warn('Qdrant is not available - will retry on first request');
    }

    // Create and start Express app
    const app = createApp();

    const server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
      logger.info(`Health check: http://localhost:${env.port}/health`);
      logger.info(`API base: http://localhost:${env.port}/api/v1`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectRedis();
          logger.info('Redis disconnected');
        } catch (error) {
          logger.error('Error disconnecting Redis:', error);
        }

        try {
          await disconnectDatabase();
          logger.info('Database disconnected');
        } catch (error) {
          logger.error('Error disconnecting database:', error);
        }

        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// =============================================================================
// RUN
// =============================================================================

startServer();


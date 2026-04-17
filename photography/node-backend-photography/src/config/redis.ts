import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../common/utils/logger.js';

// Create Redis connection for BullMQ
export const createRedisConnection = () => {
  const connection = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
  });

  connection.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  connection.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  return connection;
};

// Singleton connection for the application
let redisConnection: Redis | null = null;

export const getRedisConnection = () => {
  if (!redisConnection) {
    redisConnection = createRedisConnection();
  }
  return redisConnection;
};

export const closeRedisConnection = async () => {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    logger.info('Redis connection closed');
  }
};


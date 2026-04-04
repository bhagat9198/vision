import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../common/utils/logger.js';

// Create Redis connection
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

// Redis Streams helpers
export const publishToStream = async (
  streamKey: string,
  data: Record<string, string>
) => {
  const redis = getRedisConnection();
  return redis.xadd(streamKey, '*', ...Object.entries(data).flat());
};

export const subscribeToStream = async (
  streamKey: string,
  group: string,
  consumer: string,
  handler: (message: Record<string, string>) => Promise<void>,
  lastId = '>'
) => {
  const redis = getRedisConnection();

  // Create consumer group if it doesn't exist
  try {
    await redis.xgroup('CREATE', streamKey, group, '0', 'MKSTREAM');
  } catch {
    // Group already exists
  }

  const poll = async () => {
    try {
      const results = await redis.xreadgroup(
        'GROUP', group, consumer,
        'COUNT', '10',
        'BLOCK', '5000',
        'STREAMS', streamKey, lastId
      );

      if (results) {
        for (const [, messages] of results) {
          for (const [id, fields] of messages as [string, string[]][]) {
            const data: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]!] = fields[i + 1]!;
            }
            await handler(data);
            await redis.xack(streamKey, group, id);
          }
        }
      }
    } catch (err) {
      logger.error('Redis stream read error:', err);
    }

    // Continue polling if connection is still active
    if (redisConnection) {
      setImmediate(poll);
    }
  };

  poll();
};

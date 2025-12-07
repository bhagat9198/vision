/**
 * =============================================================================
 * Environment Configuration
 * =============================================================================
 * Loads and validates environment variables using Zod schema.
 * Provides type-safe access to all configuration values.
 * =============================================================================
 */

import { config } from 'dotenv';
import { z } from 'zod';
import type { EnvConfig } from '../types/index.js';

// Load .env file
config();

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4001'),

  // Database
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/img_analyse'),

  // Master API Key (for org registration)
  MASTER_API_KEY: z.string().min(8).default('master-key-change-me'),

  // Qdrant
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().default(''),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().default(''),

  // CompreFace
  COMPREFACE_URL: z.string().url().default('http://localhost:8000'),
  COMPREFACE_RECOGNITION_API_KEY: z.string().default(''),
  COMPREFACE_DETECTION_API_KEY: z.string().default(''),

  // Python Sidecar
  PYTHON_SIDECAR_URL: z.string().url().default('http://localhost:4002'),

  // Face Processing Defaults
  FACE_MIN_SIZE_PX: z.string().transform(Number).default('60'),
  FACE_MIN_CONFIDENCE: z.string().transform(Number).default('0.7'),
  FACE_SKIP_EXTREME_ANGLES: z.string().transform((v) => v === 'true').default('true'),
  FACE_EMBEDDING_DIMENSION: z.string().transform(Number).default('512'),

  // Search Defaults
  SEARCH_DEFAULT_TOP_K: z.string().transform(Number).default('100'),
  SEARCH_MIN_SIMILARITY: z.string().transform(Number).default('0.6'),
  EMBEDDING_CACHE_TTL_SECONDS: z.string().transform(Number).default('1800'),

  // Logging
  LOG_LEVEL: z.string().default('info'),
});

// =============================================================================
// PARSE & VALIDATE
// =============================================================================

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

// =============================================================================
// EXPORT CONFIGURATION
// =============================================================================

/**
 * Type-safe environment configuration.
 * Access via: env.propertyName
 */
export const env: EnvConfig = {
  // Server
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,

  // Database
  databaseUrl: parsed.data.DATABASE_URL,

  // Master API Key
  masterApiKey: parsed.data.MASTER_API_KEY,

  // Qdrant
  qdrantUrl: parsed.data.QDRANT_URL,
  qdrantApiKey: parsed.data.QDRANT_API_KEY,

  // Redis
  redisHost: parsed.data.REDIS_HOST,
  redisPort: parsed.data.REDIS_PORT,
  redisPassword: parsed.data.REDIS_PASSWORD,

  // CompreFace
  comprefaceUrl: parsed.data.COMPREFACE_URL,
  comprefaceRecognitionApiKey: parsed.data.COMPREFACE_RECOGNITION_API_KEY,
  comprefaceDetectionApiKey: parsed.data.COMPREFACE_DETECTION_API_KEY,

  // Python Sidecar
  pythonSidecarUrl: parsed.data.PYTHON_SIDECAR_URL,

  // Face Processing
  faceMinSizePx: parsed.data.FACE_MIN_SIZE_PX,
  faceMinConfidence: parsed.data.FACE_MIN_CONFIDENCE,
  faceSkipExtremeAngles: parsed.data.FACE_SKIP_EXTREME_ANGLES,
  faceEmbeddingDimension: parsed.data.FACE_EMBEDDING_DIMENSION,

  // Search
  searchDefaultTopK: parsed.data.SEARCH_DEFAULT_TOP_K,
  searchMinSimilarity: parsed.data.SEARCH_MIN_SIMILARITY,
  embeddingCacheTtlSeconds: parsed.data.EMBEDDING_CACHE_TTL_SECONDS,

  // Logging
  logLevel: parsed.data.LOG_LEVEL,
};


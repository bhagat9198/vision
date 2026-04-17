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
  QDRANT_API_KEY: z.string().default('').optional(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().default(''),

  // Python Sidecar
  PYTHON_SIDECAR_URL: z.string().url().default('http://localhost:4002'),

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
  qdrantApiKey: parsed.data.QDRANT_API_KEY || '',

  // Redis
  redisHost: parsed.data.REDIS_HOST,
  redisPort: parsed.data.REDIS_PORT,
  redisPassword: parsed.data.REDIS_PASSWORD,

  // Python Sidecar
  pythonSidecarUrl: parsed.data.PYTHON_SIDECAR_URL,

  // Logging
  logLevel: parsed.data.LOG_LEVEL,
};


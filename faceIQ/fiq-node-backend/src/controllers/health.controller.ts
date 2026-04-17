/**
 * =============================================================================
 * Health Controller
 * =============================================================================
 * Health check endpoints for monitoring service status.
 * =============================================================================
 */

import type { Request, Response } from 'express';
import { checkQdrantHealth, checkRedisHealth, checkDatabaseHealth } from '../config/index.js';
import type { HealthCheckResponse } from '../types/index.js';

// =============================================================================
// HEALTH CONTROLLER
// =============================================================================

/**
 * Health check controller.
 */
export const healthController = {
  /**
   * Basic health check - just confirms service is running.
   */
  async ping(_req: Request, res: Response): Promise<void> {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  },

  /**
   * Detailed health check - checks all dependencies.
   * Note: CompreFace and Python sidecar health checks require org settings,
   * so they are not checked here. Use org-specific endpoints for those.
   */
  async detailed(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    // Check core dependencies in parallel
    const [qdrantHealth, redisHealth, databaseHealth] = await Promise.all([
      checkQdrantHealth(),
      checkRedisHealth(),
      checkDatabaseHealth(),
    ]);

    const allHealthy =
      qdrantHealth.status === 'up' &&
      redisHealth.status === 'up' &&
      databaseHealth.status === 'up';

    const response: HealthCheckResponse = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      services: {
        qdrant: qdrantHealth,
        redis: redisHealth,
        database: databaseHealth,
        compreface: { status: 'up' }, // Requires org settings to check
        pythonSidecar: { status: 'up' }, // Requires org settings to check
      },
    };

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  },

  /**
   * Readiness check - for Kubernetes readiness probes.
   * Returns 200 only if critical dependencies are up.
   */
  async ready(_req: Request, res: Response): Promise<void> {
    const [qdrantHealth, databaseHealth] = await Promise.all([
      checkQdrantHealth(),
      checkDatabaseHealth(),
    ]);

    const isReady = qdrantHealth.status === 'up' && databaseHealth.status === 'up';

    if (isReady) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({
        status: 'not_ready',
        qdrant: qdrantHealth.status,
        database: databaseHealth.status,
      });
    }
  },

  /**
   * Liveness check - for Kubernetes liveness probes.
   * Returns 200 if the process is alive.
   */
  async live(_req: Request, res: Response): Promise<void> {
    res.json({ status: 'alive' });
  },
};


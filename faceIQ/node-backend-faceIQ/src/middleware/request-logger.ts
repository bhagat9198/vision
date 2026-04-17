/**
 * =============================================================================
 * Request Logging Middleware
 * =============================================================================
 * Logs incoming HTTP requests and their responses.
 * =============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    // Generate request ID
    const requestId = uuidv4();
    req.headers['x-request-id'] = requestId;

    // Track start time
    const startTime = Date.now();

    // Log request
    logger.info(`Incoming Request: ${req.method} ${req.url}`, {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') ? req.body : undefined
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (body) {
        // Restore original send
        res.send = originalSend;

        // Calculate duration
        const duration = Date.now() - startTime;

        // Log response
        logger.info(`Response Sent: ${res.statusCode} ${req.method} ${req.url}`, {
            requestId,
            statusCode: res.statusCode,
            durationMs: duration,
            contentLength: res.get('content-length'),
            // Don't log full response body for large responses
            bodySummary: typeof body === 'string' && body.length < 1000 ? body : '[Response Body]'
        });

        // Call original send
        return originalSend.call(this, body);
    };

    next();
};

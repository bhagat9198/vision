import { Request, Response, NextFunction } from 'express';
import { logger } from '../common/utils/logger.js';

import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  // Cast to any to avoid TS error if x-request-id is not in Request type
  (req as any).requestId = requestId;

  const start = Date.now();

  // Log incoming request
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') ? req.body : undefined
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    res.send = originalSend;

    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](`Response Sent: ${res.statusCode} ${req.method} ${req.originalUrl}`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      bodySummary: typeof body === 'string' && body.length < 1000 ? body : '[Response Body]'
    });

    return originalSend.call(this, body);
  };

  next();
};


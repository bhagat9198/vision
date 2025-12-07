import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: 'Route not found',
  });
};


import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK,
  message?: string
) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number }
) => {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
  };
  res.status(StatusCodes.OK).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message?: string) => {
  sendSuccess(res, data, StatusCodes.CREATED, message);
};

export const sendNoContent = (res: Response) => {
  res.status(StatusCodes.NO_CONTENT).send();
};

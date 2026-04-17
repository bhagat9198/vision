import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

export interface PaginatedQuery {
  page?: string;
  limit?: string;
}

export interface IdParam {
  id: string;
}


import { PAGINATION } from '../../config/constants.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPagination = (
  page?: string | number,
  limit?: string | number
): PaginationParams => {
  const pageNum = Math.max(1, Number(page) || PAGINATION.DEFAULT_PAGE);
  const limitNum = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Number(limit) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    skip,
  };
};


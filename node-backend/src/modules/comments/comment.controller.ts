import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../common/utils/response.js';
import type { CreateCommentDto, CommentQueryDto } from './comment.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class CommentController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoId } = req.params;
      const data = req.body as CreateCommentDto;
      const comment = await commentService.create(photoId as string, data);
      sendCreated(res, comment, 'Comment added successfully');
    } catch (error) {
      next(error);
    }
  }

  async findByPhotoId(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoId } = req.params;
      const query = req.query as CommentQueryDto;
      const { comments, total, page, limit } = await commentService.findByPhotoId(photoId as string, query);
      sendPaginated(res, comments, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      await commentService.delete(id as string, user.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const commentController = new CommentController();


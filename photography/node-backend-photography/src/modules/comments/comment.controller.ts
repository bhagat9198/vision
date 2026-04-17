import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../common/utils/response.js';
import type { CreateCommentDto, CommentQueryDto } from './comment.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class CommentController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoId } = req.params;
      const body = req.body;

      // Handle alias and defaults
      const text = body.text || body.content;

      // Get user info from auth token if available, otherwise use body or default
      const user = req.user;

      let userName = body.userName;
      let userEmail = body.userEmail;

      if (user) {
        if (user.role === 'PHOTOGRAPHER') {
          userName = userName || 'Photographer';
          userEmail = userEmail || user.email;
        } else if (user.role === 'CLIENT') {
          // For clients, user.email might be phone if they logged in via phone
          // In auth.service, we map the persistent client fields to req.user
          // So user.name should be the persistent name
          userName = (user as any).name || userName || 'Guest User';
          userEmail = userEmail || user.email;
        }
      }

      userName = userName || 'Guest User';

      const data: CreateCommentDto = {
        text,
        userName,
        userEmail,
        userAvatar: body.userAvatar
      };

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


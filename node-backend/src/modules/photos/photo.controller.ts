import { Request, Response, NextFunction } from 'express';
import { photoService } from './photo.service.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../common/utils/response.js';
import type { CreatePhotoDto, UpdatePhotoDto, BulkCreatePhotosDto, PhotoQueryDto, LikePhotoDto } from './photo.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class PhotoController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { albumId } = req.params;
      const data = req.body as CreatePhotoDto;
      const photo = await photoService.create(albumId as string, user.id, data);
      sendCreated(res, photo, 'Photo created successfully');
    } catch (error) {
      next(error);
    }
  }

  async bulkCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { albumId } = req.params;
      const data = req.body as BulkCreatePhotosDto;
      const result = await photoService.bulkCreate(albumId as string, user.id, data);
      sendCreated(res, result, `${result.count} photos created successfully`);
    } catch (error) {
      next(error);
    }
  }

  async findByEventId(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const query = req.query as PhotoQueryDto;
      const { photos, total, page, limit } = await photoService.findByEventId(eventId as string, query);
      sendPaginated(res, photos, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const photo = await photoService.findById(id as string);
      sendSuccess(res, photo);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      const data = req.body as UpdatePhotoDto;
      const photo = await photoService.update(id as string, user.id, data);
      sendSuccess(res, photo, 200, 'Photo updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      await photoService.delete(id as string, user.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async toggleLike(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as LikePhotoDto;
      const result = await photoService.toggleLike(id as string, data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const photoController = new PhotoController();


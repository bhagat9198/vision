import { Request, Response, NextFunction } from 'express';
import { albumService } from './album.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/response.js';
import type { CreateAlbumDto, UpdateAlbumDto, ReorderAlbumsDto } from './album.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class AlbumController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { eventId } = req.params;
      const data = req.body as CreateAlbumDto;
      const album = await albumService.create(eventId as string, user.id, data);
      sendCreated(res, album, 'Album created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findByEventId(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      // parentId query param: undefined = all, "null" = root only, or albumId for children
      const parentIdParam = req.query.parentId as string | undefined;
      const parentId = parentIdParam === 'null' ? null : parentIdParam;
      const albums = await albumService.findByEventId(eventId as string, parentId);
      sendSuccess(res, albums);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const album = await albumService.findById(id as string);
      sendSuccess(res, album);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      const data = req.body as UpdateAlbumDto;
      const album = await albumService.update(id as string, user.id, data);
      sendSuccess(res, album, 200, 'Album updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      await albumService.delete(id as string, user.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { eventId } = req.params;
      const data = req.body as ReorderAlbumsDto;
      const albums = await albumService.reorder(eventId as string, user.id, data);
      sendSuccess(res, albums, 200, 'Albums reordered successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const albumController = new AlbumController();


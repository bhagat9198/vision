import { Request, Response, NextFunction } from 'express';
import { photographerService } from './photographer.service.js';
import { sendSuccess } from '../../common/utils/response.js';
import type { UpdatePhotographerDto } from './photographer.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class PhotographerController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const photographer = await photographerService.getById(user.id);
      sendSuccess(res, photographer);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const data = req.body as UpdatePhotographerDto;
      const photographer = await photographerService.update(user.id, data);
      sendSuccess(res, photographer, 200, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const stats = await photographerService.getStats(user.id);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const photographer = await photographerService.getById(id as string);
      sendSuccess(res, photographer);
    } catch (error) {
      next(error);
    }
  }
}

export const photographerController = new PhotographerController();


import { Request, Response, NextFunction } from 'express';
import { superAdminDashboardService } from './super-admin-dashboard.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class SuperAdminDashboardController {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await superAdminDashboardService.getStats();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getPhotographers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await superAdminDashboardService.getPhotographers(page, limit, search);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async togglePhotographerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await superAdminDashboardService.togglePhotographerStatus(id);
      sendSuccess(res, result, 200, `Photographer ${result.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await superAdminDashboardService.getEvents(page, limit, search);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getPhotographer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await superAdminDashboardService.getPhotographerById(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await superAdminDashboardService.getEventById(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminDashboardController = new SuperAdminDashboardController();


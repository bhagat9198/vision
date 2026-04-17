import { Request, Response, NextFunction } from 'express';
import { superAdminService } from './super-admin.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { SuperAdminSetupDto, SuperAdminLoginDto, SuperAdminChangePasswordDto } from './super-admin.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class SuperAdminController {
  async checkExists(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await superAdminService.checkExists();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as SuperAdminSetupDto;
      const result = await superAdminService.setup(data);
      sendCreated(res, result, 'Super admin created successfully');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as SuperAdminLoginDto;
      const result = await superAdminService.login(data);
      sendSuccess(res, result, 200, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const profile = await superAdminService.getProfile(user.id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const data = req.body as SuperAdminChangePasswordDto;
      const result = await superAdminService.changePassword(user.id, data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminController = new SuperAdminController();


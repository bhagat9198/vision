import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { RegisterDto, LoginDto, ChangePasswordDto, SendOtpDto, VerifyOtpDto } from './auth.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class AuthController {
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as SendOtpDto;
      const result = await authService.sendOtp(data);
      sendSuccess(res, result, 200, 'OTP sent successfully');
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as VerifyOtpDto;
      const result = await authService.verifyOtp(data);
      sendSuccess(res, result, 200, 'OTP verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as RegisterDto;
      const result = await authService.register(data);
      sendCreated(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as LoginDto;
      const result = await authService.login(data);
      sendSuccess(res, result, 200, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const profile = await authService.getProfile(user.id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const data = req.body as ChangePasswordDto;
      const result = await authService.changePassword(user.id, data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();


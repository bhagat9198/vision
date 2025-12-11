import { Request, Response, NextFunction } from 'express';
import { configService } from './config.service.js';
import { updateConfigsDto, createTemplateDto, updateTemplateDto } from './config.dto.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';

export class ConfigController {
  // Get public auth config (for login/signup pages - limited info)
  async getPublicAuthConfig(req: Request, res: Response, next: NextFunction) {
    try {
      // Photographer auth settings
      const emailVerification = await configService.get('photographer_email_verification_enabled', 'false');
      const phoneAuth = await configService.get('photographer_phone_auth_enabled', 'false');
      const googleLogin = await configService.get('photographer_google_login_enabled', 'false');
      const facebookLogin = await configService.get('photographer_facebook_login_enabled', 'false');
      const appleLogin = await configService.get('photographer_apple_login_enabled', 'false');

      // User auth settings
      const userEmailVerification = await configService.get('user_email_verification_enabled', 'false');
      const userPhoneAuth = await configService.get('user_phone_auth_enabled', 'false');

      const publicConfig = {
        photographerEmailVerificationEnabled: emailVerification === 'true',
        photographerPhoneAuthEnabled: phoneAuth === 'true',
        photographerGoogleLoginEnabled: googleLogin === 'true',
        photographerFacebookLoginEnabled: facebookLogin === 'true',
        photographerAppleLoginEnabled: appleLogin === 'true',

        userEmailVerificationEnabled: userEmailVerification === 'true',
        userPhoneAuthEnabled: userPhoneAuth === 'true',
      };
      sendSuccess(res, publicConfig, 200, 'Public auth config retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Get all auth configs (super admin only)
  async getAuthConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const configs = await configService.getAuthConfigs();
      sendSuccess(res, configs, 200, 'Auth configs retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Update auth configs
  async updateAuthConfig(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Received config update request:', req.body);
      const data = updateConfigsDto.parse(req.body);
      console.log('Parsed config data:', data);
      await configService.updateConfigs(data);
      console.log('Configs updated in DB');
      const configs = await configService.getAuthConfigs();
      sendSuccess(res, configs, 200, 'Auth configs updated');
    } catch (error) {
      console.error('Error updating configs:', error);
      next(error);
    }
  }

  // Get enabled providers (for template dropdown)
  async getEnabledProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const emailProviders = await configService.getEnabledEmailProviders();
      const smsProviders = await configService.getEnabledSmsProviders();
      sendSuccess(res, { emailProviders, smsProviders }, 200, 'Enabled providers retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Get all templates
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.query;
      const templates = await configService.getTemplates(type as string);
      sendSuccess(res, templates, 200, 'Templates retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Create template
  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createTemplateDto.parse(req.body);
      const template = await configService.createTemplate(data);
      sendCreated(res, template, 'Template created');
    } catch (error) {
      next(error);
    }
  }

  // Update template
  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateTemplateDto.parse(req.body);
      const template = await configService.updateTemplate(id, data);
      sendSuccess(res, template, 200, 'Template updated');
    } catch (error) {
      next(error);
    }
  }

  // Delete template
  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await configService.deleteTemplate(id);
      sendSuccess(res, null, 200, 'Template deleted');
    } catch (error) {
      next(error);
    }
  }

  // Get all configs
  async getAllConfigs(req: Request, res: Response, next: NextFunction) {
    try {
      const configs = await configService.getAllConfigs();
      sendSuccess(res, configs, 200, 'All configs retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get face analysis configuration.
   * Used by img-analyse-backend to fetch settings.
   * Requires internal key authentication.
   */
  async getFaceAnalysisConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await configService.getFaceAnalysisConfig();
      sendSuccess(res, config, 200, 'Face analysis config retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const configController = new ConfigController();


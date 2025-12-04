import { prisma } from '../../config/database.js';
import { logger } from '../utils/logger.js';

interface SmsResponse {
  success: boolean;
  message: string;
  provider: string;
  rawResponse?: string;
}

interface BulkSmsConfig {
  username: string;
  apiKey: string;
  senderId: string;
}

interface TemplateData {
  templateText: string;
  dltTemplateId?: string;
}

export class SmsService {
  // Get BulkSMS config from database
  private async getBulkSmsConfig(): Promise<BulkSmsConfig | null> {
    const [username, apiKey, senderId] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'bulksms_username' } }),
      prisma.systemConfig.findUnique({ where: { key: 'bulksms_api_key' } }),
      prisma.systemConfig.findUnique({ where: { key: 'bulksms_sender_id' } }),
    ]);

    if (!username?.value || !apiKey?.value || !senderId?.value) {
      return null;
    }

    return {
      username: username.value,
      apiKey: apiKey.value,
      senderId: senderId.value,
    };
  }

  // Get template by config key (e.g., 'photographer_phone_otp_template')
  private async getTemplateFromConfig(configKey: string): Promise<TemplateData | null> {
    // Get the template ID from config
    const config = await prisma.systemConfig.findUnique({ where: { key: configKey } });
    if (!config?.value) {
      logger.warn('[SMS] No template configured', { configKey });
      return null;
    }

    // Get the actual template
    const template = await prisma.messageTemplate.findUnique({ where: { id: config.value } });
    if (!template) {
      logger.warn('[SMS] Template not found', { configKey, templateId: config.value });
      return null;
    }

    return {
      templateText: template.templateText,
      dltTemplateId: template.templateId || undefined,
    };
  }

  // Replace variables in template text
  // Supports both {{varName}} format and {#var#} (DLT positional) format
  private replaceVariables(text: string, variables: Record<string, string>, variableOrder?: string[]): string {
    let result = text;

    // First try {{varName}} format
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Then handle {#var#} (DLT positional format) - replace in order
    if (result.includes('{#var#}') && variableOrder) {
      for (const varName of variableOrder) {
        if (variables[varName]) {
          result = result.replace('{#var#}', variables[varName]);
        }
      }
    }

    return result;
  }

  // Send SMS via BulkSMS (smslogin.co)
  async sendViaBulkSms(phone: string, message: string, dltTemplateId?: string): Promise<SmsResponse> {
    const config = await this.getBulkSmsConfig();

    if (!config) {
      logger.error('[SMS] BulkSMS config not found. Please configure username, api_key, and sender_id');
      return { success: false, message: 'SMS provider not configured', provider: 'bulksms' };
    }

    // Build the API URL
    const params = new URLSearchParams({
      username: config.username,
      apikey: config.apiKey,
      senderid: config.senderId,
      mobile: phone,
      message: message,
    });

    if (dltTemplateId) {
      params.append('templateid', dltTemplateId);
    }

    const url = `https://smslogin.co/v3/api.php?${params.toString()}`;

    // Log the request (mask sensitive data)
    logger.info('[SMS] Sending via BulkSMS', {
      provider: 'bulksms',
      phone: phone.slice(0, 2) + '****' + phone.slice(-2),
      message: message,
      dltTemplateId: dltTemplateId || 'none',
      url: url.replace(config.apiKey, '****').replace(config.username, '****'),
    });

    try {
      const response = await fetch(url);
      const responseText = await response.text();

      logger.info('[SMS] BulkSMS response', {
        status: response.status,
        response: responseText,
      });

      const isSuccess = response.ok && !responseText.toLowerCase().includes('error');

      return {
        success: isSuccess,
        message: isSuccess ? 'SMS sent successfully' : responseText,
        provider: 'bulksms',
        rawResponse: responseText,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[SMS] BulkSMS API error', { error: errorMessage });
      return {
        success: false,
        message: `Failed to send SMS: ${errorMessage}`,
        provider: 'bulksms',
      };
    }
  }

  // Send OTP for photographer signup/login
  async sendOtpForPhotographer(phone: string, otp: string, type: 'signup' | 'login' | 'password_reset'): Promise<SmsResponse> {
    // Get template from config
    const configKey = 'photographer_phone_otp_template';
    const template = await this.getTemplateFromConfig(configKey);

    if (!template) {
      logger.error('[SMS] No template configured for photographer phone OTP');
      return { success: false, message: 'SMS template not configured', provider: 'none' };
    }

    // Replace variables in template
    // Use template.variables array for {#var#} positional replacement order
    const message = this.replaceVariables(
      template.templateText,
      {
        otp: otp,
        validMinutes: '10',
      },
      template.variables || ['otp', 'validMinutes'] // Default order if not specified
    );

    return this.sendViaBulkSms(phone, message, template.dltTemplateId);
  }
}

export const smsService = new SmsService();


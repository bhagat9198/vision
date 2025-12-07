import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '../../config/database.js';
import { logger } from '../utils/logger.js';

interface EmailResponse {
  success: boolean;
  message: string;
  provider: string;
  messageId?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

interface TemplateData {
  templateText: string;
  subject?: string;
  isHtml: boolean;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private smtpConfig: SmtpConfig | null = null;

  // Get SMTP config from database
  private async getSmtpConfig(): Promise<SmtpConfig | null> {
    const [enabled, host, port, user, password, from] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'smtp_enabled' } }),
      prisma.systemConfig.findUnique({ where: { key: 'smtp_host' } }),
      prisma.systemConfig.findUnique({ where: { key: 'smtp_port' } }),
      prisma.systemConfig.findUnique({ where: { key: 'smtp_user' } }),
      prisma.systemConfig.findUnique({ where: { key: 'smtp_password' } }),
      prisma.systemConfig.findUnique({ where: { key: 'smtp_from' } }),
    ]);

    if (enabled?.value !== 'true') {
      logger.warn('[Email] SMTP is not enabled in config');
      return null;
    }

    if (!host?.value || !user?.value || !password?.value || !from?.value) {
      logger.error('[Email] SMTP config incomplete. Missing host, user, password, or from address');
      return null;
    }

    return {
      host: host.value,
      port: parseInt(port?.value || '587', 10),
      user: user.value,
      password: password.value,
      from: from.value,
    };
  }

  // Initialize or get transporter
  private async getTransporter(): Promise<Transporter | null> {
    const config = await this.getSmtpConfig();
    if (!config) return null;

    // Check if config changed, recreate transporter if needed
    if (
      this.transporter &&
      this.smtpConfig &&
      this.smtpConfig.host === config.host &&
      this.smtpConfig.port === config.port &&
      this.smtpConfig.user === config.user
    ) {
      return this.transporter;
    }

    this.smtpConfig = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    return this.transporter;
  }

  // Get template by config key
  private async getTemplateFromConfig(configKey: string): Promise<TemplateData | null> {
    const config = await prisma.systemConfig.findUnique({ where: { key: configKey } });
    if (!config?.value) {
      logger.warn('[Email] No template configured', { configKey });
      return null;
    }

    const template = await prisma.messageTemplate.findUnique({ where: { id: config.value } });
    if (!template) {
      logger.warn('[Email] Template not found', { configKey, templateId: config.value });
      return null;
    }

    return {
      templateText: template.templateText,
      subject: template.name, // Use template name as subject
      isHtml: template.isHtml,
    };
  }

  // Replace variables in template text
  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  // Send email via SMTP
  async sendViaSMTP(to: string, subject: string, body: string, isHtml = false): Promise<EmailResponse> {
    const transporter = await this.getTransporter();
    const config = await this.getSmtpConfig();

    if (!transporter || !config) {
      return { success: false, message: 'SMTP not configured', provider: 'smtp' };
    }

    try {
      logger.info('[Email] Sending via SMTP', { to, subject });

      const result = await transporter.sendMail({
        from: config.from,
        to,
        subject,
        ...(isHtml ? { html: body } : { text: body }),
      });

      logger.info('[Email] Sent successfully', { to, messageId: result.messageId });
      return { success: true, message: 'Email sent', provider: 'smtp', messageId: result.messageId };
    } catch (error) {
      logger.error('[Email] Failed to send', { to, error: (error as Error).message });
      return { success: false, message: (error as Error).message, provider: 'smtp' };
    }
  }

  // Send OTP for photographer signup/login
  async sendOtpForPhotographer(email: string, otp: string, type: 'signup' | 'login' | 'password_reset'): Promise<EmailResponse> {
    const configKey = 'photographer_email_otp_template';
    const template = await this.getTemplateFromConfig(configKey);

    if (!template) {
      logger.error('[Email] No template configured for photographer email OTP');
      return { success: false, message: 'Email template not configured', provider: 'none' };
    }

    const body = this.replaceVariables(template.templateText, {
      otp,
      validMinutes: '10',
      type: type === 'signup' ? 'sign up' : type === 'login' ? 'login' : 'password reset',
    });

    const subject = template.subject || `Your OTP for ${type === 'signup' ? 'Sign Up' : type === 'login' ? 'Login' : 'Password Reset'}`;

    return this.sendViaSMTP(email, subject, body, template.isHtml);
  }
}

export const emailService = new EmailService();


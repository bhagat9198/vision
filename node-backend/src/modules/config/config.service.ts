import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../common/exceptions/AppError.js';

// Default configs - each will be stored as a separate row
export const DEFAULT_CONFIGS: Record<string, { value: string; options?: string[] }> = {
  // General auth settings
  email_verification_enabled: { value: 'false' },
  phone_auth_enabled: { value: 'false' },

  // SMTP Provider
  smtp_enabled: { value: 'false' },
  smtp_host: { value: '' },
  smtp_port: { value: '587' },
  smtp_user: { value: '' },
  smtp_password: { value: '' },
  smtp_from: { value: '' },

  // SendGrid Provider
  sendgrid_enabled: { value: 'false' },
  sendgrid_api_key: { value: '' },
  sendgrid_from: { value: '' },

  // Twilio Email Provider
  twilio_email_enabled: { value: 'false' },
  twilio_email_api_key: { value: '' },
  twilio_email_from: { value: '' },

  // Fast2SMS Provider
  fast2sms_enabled: { value: 'false' },
  fast2sms_api_key: { value: '' },
  fast2sms_sender_id: { value: '' },

  // BulkSMS Provider
  bulksms_enabled: { value: 'false' },
  bulksms_api_key: { value: '' },
  bulksms_sender_id: { value: '' },
};

export class ConfigService {
  // Get a single config value by key
  async get(key: string, defaultValue?: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return defaultValue ?? DEFAULT_CONFIGS[key]?.value ?? null;
    }

    return config.value;
  }

  // Set a single config value
  async set(key: string, value: string, options?: string[]): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value, options: options ?? null },
      create: { key, value, options: options ?? null },
    });
  }

  // Get all auth-related configs
  async getAuthConfigs(): Promise<Record<string, { value: string; options: string[] | null }>> {
    const configs = await prisma.systemConfig.findMany();
    const result: Record<string, { value: string; options: string[] | null }> = {};

    // Start with defaults
    for (const [key, def] of Object.entries(DEFAULT_CONFIGS)) {
      result[key] = { value: def.value, options: def.options ?? null };
    }

    // Override with actual values from DB
    for (const config of configs) {
      result[config.key] = {
        value: config.value,
        options: config.options as string[] | null
      };
    }

    return result;
  }

  // Update multiple configs at once
  async updateConfigs(data: Record<string, string>): Promise<void> {
    console.log('ConfigService.updateConfigs called with:', Object.keys(data).length, 'keys');
    const operations = Object.entries(data).map(([key, value]) => {
      console.log(`Upserting: ${key} = ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
      return prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value, options: DEFAULT_CONFIGS[key]?.options ?? null },
      });
    });
    const results = await prisma.$transaction(operations);
    console.log('Transaction completed, updated:', results.length, 'records');
  }

  // Initialize default configs if they don't exist
  async initializeDefaults(): Promise<void> {
    for (const [key, def] of Object.entries(DEFAULT_CONFIGS)) {
      const existing = await prisma.systemConfig.findUnique({ where: { key } });
      if (!existing) {
        await prisma.systemConfig.create({
          data: { key, value: def.value, options: def.options ?? null },
        });
      }
    }
  }

  // Get enabled email providers
  async getEnabledEmailProviders(): Promise<string[]> {
    const providers: string[] = [];
    if ((await this.get('smtp_enabled')) === 'true') providers.push('smtp');
    if ((await this.get('sendgrid_enabled')) === 'true') providers.push('sendgrid');
    if ((await this.get('twilio_email_enabled')) === 'true') providers.push('twilio');
    return providers;
  }

  // Get enabled SMS providers
  async getEnabledSmsProviders(): Promise<string[]> {
    const providers: string[] = [];
    if ((await this.get('fast2sms_enabled')) === 'true') providers.push('fast2sms');
    if ((await this.get('bulksms_enabled')) === 'true') providers.push('bulksms');
    return providers;
  }

  // Get all message templates
  async getTemplates(type?: string) {
    const where = type ? { type } : {};
    return prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get active template by type
  async getActiveTemplate(type: string) {
    return prisma.messageTemplate.findFirst({
      where: { type, isActive: true },
    });
  }

  // Create template
  async createTemplate(data: {
    name: string;
    type: string;
    provider?: string;
    templateId?: string;
    templateText: string;
    variables?: string[];
    isHtml?: boolean;
  }) {
    // If creating an active template, deactivate others of same type and provider
    return prisma.messageTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        provider: data.provider,
        templateId: data.templateId,
        templateText: data.templateText,
        variables: data.variables || [],
        isHtml: data.isHtml || false,
        isActive: false, // New templates start inactive
      },
    });
  }

  // Update template
  async updateTemplate(id: string, data: {
    name?: string;
    provider?: string;
    templateId?: string;
    templateText?: string;
    variables?: string[];
    isHtml?: boolean;
    isActive?: boolean;
  }) {
    const template = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundError('Template not found');

    // If activating this template, deactivate others of same type and provider
    if (data.isActive) {
      await prisma.messageTemplate.updateMany({
        where: {
          type: template.type,
          provider: template.provider,
          id: { not: id }
        },
        data: { isActive: false },
      });
    }

    return prisma.messageTemplate.update({
      where: { id },
      data,
    });
  }

  // Delete template
  async deleteTemplate(id: string) {
    return prisma.messageTemplate.delete({ where: { id } });
  }

  // Get all configs (for admin panel)
  async getAllConfigs() {
    const configs = await prisma.systemConfig.findMany();
    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }
}

export const configService = new ConfigService();


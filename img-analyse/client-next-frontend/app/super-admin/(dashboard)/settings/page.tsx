'use client';

import { useEffect, useState, useMemo } from 'react';
import { Settings, Shield, FileText, Mail, Phone, Save, Loader2, Plus, Trash2, Check, ChevronDown, ChevronRight, Eye, EyeOff, Code, Copy, Camera, Pencil, X, Brain, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryTabs } from '@/lib/hooks/use-query-tabs';

// Config is now key-value pairs
type ConfigData = Record<string, { value: string; options: string[] | null }>;

interface Template {
  id: string;
  name: string;
  type: string;
  provider: string | null;
  templateId: string;
  templateText: string;
  variables: string[];
  isHtml: boolean;
  isActive: boolean;
}

// Predefined variables for each template type with sample values
const TEMPLATE_VARIABLES: Record<string, { name: string; sample: string; description: string }[]> = {
  EMAIL_OTP: [
    { name: 'otp', sample: '123456', description: 'One-time password' },
    { name: 'validMinutes', sample: '10', description: 'OTP validity in minutes' },
    { name: 'userName', sample: 'John Doe', description: 'User name' },
  ],
  SMS_OTP: [
    { name: 'otp', sample: '123456', description: 'One-time password' },
    { name: 'validMinutes', sample: '10', description: 'OTP validity in minutes' },
  ],
  EMAIL_WELCOME: [
    { name: 'userName', sample: 'John Doe', description: 'User name' },
    { name: 'email', sample: 'john@example.com', description: 'User email' },
    { name: 'loginUrl', sample: 'https://app.example.com/login', description: 'Login URL' },
  ],
  EMAIL_PASSWORD_RESET: [
    { name: 'userName', sample: 'John Doe', description: 'User name' },
    { name: 'resetLink', sample: 'https://app.example.com/reset?token=abc123', description: 'Password reset link' },
    { name: 'validMinutes', sample: '30', description: 'Link validity in minutes' },
  ],
  SMS_PASSWORD_RESET: [
    { name: 'otp', sample: '123456', description: 'Reset OTP' },
    { name: 'validMinutes', sample: '10', description: 'OTP validity in minutes' },
  ],
};

const TEMPLATE_TYPES = [
  { value: 'EMAIL_OTP', label: 'Email OTP' },
  { value: 'SMS_OTP', label: 'SMS OTP' },
  { value: 'EMAIL_WELCOME', label: 'Welcome Email' },
  { value: 'EMAIL_PASSWORD_RESET', label: 'Password Reset Email' },
  { value: 'SMS_PASSWORD_RESET', label: 'Password Reset SMS' },
];

// Helper to determine if a template type is SMS or Email
const isSmsType = (type: string) => type.startsWith('SMS_');


// ==================== CONFIG SCHEMA DEFINITION ====================

interface ConfigFieldDef {
  label: string;
  tooltip?: string;
  type: 'text' | 'password' | 'boolean' | 'select' | 'multiselect' | 'textarea';
  options?: { label: string; value: string }[];
  placeholder?: string;
  section?: string; // For grouping in UI
  condition?: (configs: ConfigData) => boolean; // Visibility condition
  advanced?: boolean;
}

const CONFIG_SCHEMA: Record<string, ConfigFieldDef> = {
  // --- AUTHENTICATION ---
  photographer_email_verification_enabled: { label: 'Email Verification', type: 'boolean', tooltip: 'Require email verification for photographer signup.' },
  photographer_phone_auth_enabled: { label: 'Phone Auth (Login/Signup)', type: 'boolean', tooltip: 'Allow photographers to login/signup using phone OTP.' },
  photographer_email_otp_template: { label: 'Email OTP Template', type: 'select', tooltip: 'Template used for sending email OTPs.' },
  photographer_phone_otp_template: { label: 'Phone OTP Template', type: 'select', tooltip: 'Template used for sending SMS OTPs.' },
  photographer_google_login_enabled: { label: 'Google Login', type: 'boolean' },
  photographer_facebook_login_enabled: { label: 'Facebook Login', type: 'boolean' },
  photographer_apple_login_enabled: { label: 'Apple Login', type: 'boolean' },

  user_email_verification_enabled: { label: 'Email Verification', type: 'boolean', tooltip: 'Require email verification for client signup.' },
  user_phone_auth_enabled: { label: 'Phone Auth (Login/Signup)', type: 'boolean', tooltip: 'Allow clients to login/signup using phone OTP.' },
  user_email_otp_template: { label: 'Email OTP Template', type: 'select', tooltip: 'Template used for sending email OTPs.' },
  user_phone_otp_template: { label: 'Phone OTP Template', type: 'select', tooltip: 'Template used for sending SMS OTPs.' },
  user_google_login_enabled: { label: 'Google Login', type: 'boolean' },
  user_facebook_login_enabled: { label: 'Facebook Login', type: 'boolean' },
  user_apple_login_enabled: { label: 'Apple Login', type: 'boolean' },

  // --- PROVIDERS (SMTP, SMS, etc) ---
  smtp_enabled: { label: 'Enabled', type: 'boolean' },
  smtp_host: { label: 'SMTP Host', type: 'text', placeholder: 'smtp.example.com', condition: c => c.smtp_enabled?.value === 'true' },
  smtp_port: { label: 'Port', type: 'text', placeholder: '587', condition: c => c.smtp_enabled?.value === 'true' },
  smtp_user: { label: 'Username', type: 'text', condition: c => c.smtp_enabled?.value === 'true' },
  smtp_password: { label: 'Password', type: 'password', condition: c => c.smtp_enabled?.value === 'true' },
  smtp_from: { label: 'From Email', type: 'text', placeholder: 'noreply@example.com', condition: c => c.smtp_enabled?.value === 'true' },

  sendgrid_enabled: { label: 'Enabled', type: 'boolean' },
  sendgrid_api_key: { label: 'API Key', type: 'password', condition: c => c.sendgrid_enabled?.value === 'true' },
  sendgrid_from: { label: 'From Email', type: 'text', condition: c => c.sendgrid_enabled?.value === 'true' },

  twilio_email_enabled: { label: 'Enabled', type: 'boolean' },
  twilio_email_api_key: { label: 'API Key', type: 'password', condition: c => c.twilio_email_enabled?.value === 'true' },
  twilio_email_from: { label: 'From Email', type: 'text', condition: c => c.twilio_email_enabled?.value === 'true' },

  fast2sms_enabled: { label: 'Enabled', type: 'boolean' },
  fast2sms_api_key: { label: 'API Key', type: 'password', condition: c => c.fast2sms_enabled?.value === 'true' },
  fast2sms_sender_id: { label: 'Sender ID', type: 'text', condition: c => c.fast2sms_enabled?.value === 'true' },

  bulksms_enabled: { label: 'Enabled', type: 'boolean' },
  bulksms_username: { label: 'Username', type: 'text', condition: c => c.bulksms_enabled?.value === 'true' },
  bulksms_api_key: { label: 'API Key', type: 'password', condition: c => c.bulksms_enabled?.value === 'true' },
  bulksms_sender_id: { label: 'Sender ID', type: 'text', condition: c => c.bulksms_enabled?.value === 'true' },

  // --- FACE ANALYSIS ---
  face_analysis_enabled: { label: 'Enable Face Analysis', type: 'boolean', tooltip: 'Master switch for all face recognition features.' },
  face_analysis_backend_url: { label: 'Backend URL', type: 'text', tooltip: 'URL of the img-analyse-backend service.', condition: c => c.face_analysis_enabled?.value === 'true' },
  face_analysis_api_key: { label: 'API Key (x-api-key)', type: 'password', tooltip: 'Internal API Key to secure communication.', condition: c => c.face_analysis_enabled?.value === 'true' },

  face_detection_mode: {
    label: 'Detection Mode',
    type: 'select',
    options: [
      { label: 'Recognition Only (Fast)', value: 'recognition_only' },
      { label: 'Detection then Recognition (Accurate)', value: 'detection_then_recognition' }
    ],
    tooltip: '"Recognition Only" sends full image to recognition API. "Detection then Recognition" crops faces first.',
    condition: c => c.face_analysis_enabled?.value === 'true'
  },

  face_indexing_image_source: {
    label: 'Indexing Image Source',
    type: 'select',
    options: [
      { label: 'URL (Slow - Local/S3 Download)', value: 'url' },
      { label: 'Multipart Upload (Fast - Direct Transfer)', value: 'multipart' },
      { label: 'Shared Storage (Fastest - Local)', value: 'shared_storage' }
    ],
    tooltip: 'How images are passed to the analysis backend. Shared Storage is best if both services are on same machine/volume.',
    condition: c => c.face_analysis_enabled?.value === 'true'
  },

  organization_id: {
    label: 'Organization ID',
    type: 'text',
    tooltip: 'Unique Identifier for Shared Storage matching. Required when using Shared Storage.',
    condition: c => c.face_indexing_image_source?.value === 'shared_storage' && c.face_analysis_enabled?.value === 'true'
  },

  face_indexing_shared_storage_path: {
    label: 'Shared Storage Path',
    type: 'text',
    placeholder: '/shared-storage',
    tooltip: 'Path where images are accessible by both services.',
    condition: c => c.face_indexing_image_source?.value === 'shared_storage' && c.face_analysis_enabled?.value === 'true'
  },

  face_min_confidence: { label: 'Min Confidence', type: 'text', tooltip: 'Minimum confidence (0.0 - 1.0) to consider a face match.', condition: c => c.face_analysis_enabled?.value === 'true' },
  face_search_default_top_k: { label: 'Default Top K', type: 'text', tooltip: 'Number of results to return in search.', condition: c => c.face_analysis_enabled?.value === 'true' },
  face_search_min_similarity: { label: 'Min Similarity', type: 'text', tooltip: 'Minimum similarity score to group faces.', condition: c => c.face_analysis_enabled?.value === 'true' },

  // Advanced Face Analysis
  compreface_url: { label: 'CompreFace URL', type: 'text', advanced: true, condition: c => c.face_analysis_enabled?.value === 'true' },
  compreface_recognition_api_key: { label: 'Recognition API Key', type: 'password', advanced: true, condition: c => c.face_analysis_enabled?.value === 'true' },
  compreface_detection_api_key: { label: 'Detection API Key', type: 'password', advanced: true, condition: c => c.face_analysis_enabled?.value === 'true' },
  face_python_sidecar_url: { label: 'Python Sidecar URL', type: 'text', advanced: true, condition: c => c.face_analysis_enabled?.value === 'true' },
  face_enable_fallback_detection: { label: 'Enable Fallback Detection', type: 'boolean', advanced: true, tooltip: 'Use Sidecar/YuNet if CompreFace fails.', condition: c => c.face_analysis_enabled?.value === 'true' },
  face_enable_alignment: { label: 'Enable Face Alignment', type: 'boolean', advanced: true, tooltip: 'Align faces before recognition for better accuracy.', condition: c => c.face_analysis_enabled?.value === 'true' },

  // --- GENERAL ---

  // Storage
  storage_provider: {
    label: 'Storage Provider',
    type: 'select',
    options: [
      { label: 'Local Filesystem', value: 'local' },
      { label: 'AWS S3 / Compatible', value: 's3' }
    ],
    tooltip: 'Choose where to store uploaded assets.'
  },

  storage_local_path: { label: 'Local Storage Path', type: 'text', placeholder: './uploads', condition: c => c.storage_provider?.value === 'local', tooltip: 'Directory on the server to store files.' },
  storage_local_base_url: { label: 'Local Base URL', type: 'text', placeholder: 'http://localhost:4000/uploads', condition: c => c.storage_provider?.value === 'local', tooltip: 'Public URL to access the uploads folder.' },

  storage_s3_bucket: { label: 'S3 Bucket Name', type: 'text', condition: c => c.storage_provider?.value === 's3' },
  storage_s3_region: { label: 'S3 Region', type: 'text', condition: c => c.storage_provider?.value === 's3' },
  storage_s3_access_key: { label: 'S3 Access Key', type: 'password', condition: c => c.storage_provider?.value === 's3' },
  storage_s3_secret_key: { label: 'S3 Secret Key', type: 'password', condition: c => c.storage_provider?.value === 's3' },
  storage_s3_endpoint: { label: 'S3 Endpoint', type: 'text', tooltip: 'Optional. Use for MinIO, R2, etc.', condition: c => c.storage_provider?.value === 's3' },

  // Event Deletion
  event_deletion_mode: {
    label: 'Deletion Mode',
    type: 'select',
    options: [
      { label: 'Soft Delete (Move to Trash)', value: 'soft' },
      { label: 'Hard Delete (Permanent)', value: 'hard' }
    ],
    tooltip: 'Soft delete keeps files in a trash folder. Hard delete removes them instantly.'
  },
  storage_trash_path: { label: 'Trash Folder Name', type: 'text', placeholder: '_trash', condition: c => c.event_deletion_mode?.value === 'soft', tooltip: 'Name of the trash folder relative to storage root.' },

  // Upload (Advanced/Hidden?)
  upload_chunk_size_mb: { label: 'Chunk Size (MB)', type: 'text', advanced: true },
  upload_max_file_size_mb: { label: 'Max File Size (MB)', type: 'text', advanced: true },
  upload_session_expiry_hours: { label: 'Session Expiry (Hours)', type: 'text', advanced: true },
  upload_concurrent_processing: { label: 'Concurrent Processing', type: 'text', advanced: true },
  upload_allowed_types: {
    label: 'Allowed MIME Types',
    type: 'multiselect',
    advanced: true,
    options: [
      // Common Image Formats
      { label: 'JPEG (image/jpeg)', value: 'image/jpeg' },
      { label: 'PNG (image/png)', value: 'image/png' },
      { label: 'GIF (image/gif)', value: 'image/gif' },
      { label: 'WebP (image/webp)', value: 'image/webp' },
      { label: 'HEIC (image/heic)', value: 'image/heic' },
      { label: 'HEIF (image/heif)', value: 'image/heif' },
      { label: 'BMP (image/bmp)', value: 'image/bmp' },
      { label: 'TIFF (image/tiff)', value: 'image/tiff' },
      { label: 'SVG (image/svg+xml)', value: 'image/svg+xml' },
      { label: 'ICO (image/x-icon)', value: 'image/x-icon' },
      { label: 'AVIF (image/avif)', value: 'image/avif' },
      // Common Video Formats
      { label: 'MP4 (video/mp4)', value: 'video/mp4' },
      { label: 'QuickTime (video/quicktime)', value: 'video/quicktime' },
      { label: 'AVI (video/x-msvideo)', value: 'video/x-msvideo' },
      { label: 'WebM (video/webm)', value: 'video/webm' },
      { label: 'OGG (video/ogg)', value: 'video/ogg' },
      { label: 'MKV (video/x-matroska)', value: 'video/x-matroska' },
      { label: 'FLV (video/x-flv)', value: 'video/x-flv' },
      { label: 'WMV (video/x-ms-wmv)', value: 'video/x-ms-wmv' },
      { label: 'MPEG (video/mpeg)', value: 'video/mpeg' },
      { label: '3GP (video/3gpp)', value: 'video/3gpp' },
      { label: 'MOV (video/mov)', value: 'video/mov' },
    ],
    tooltip: 'Select which file types are allowed for upload'
  },

  // Thumbnail
  thumbnail_max_dimension: { label: 'Max Dimension', type: 'text' },
  thumbnail_quality: { label: 'Quality (0-100)', type: 'text' },
  thumbnail_format: { label: 'Format', type: 'select', options: [{ label: 'JPEG', value: 'jpeg' }, { label: 'WebP', value: 'webp' }] },
};

// ==================== GROUPING CONSTANTS ====================
// Re-added for layout structure, referring to CONFIG_SCHEMA keys

const ENTITY_AUTH_CONFIGS = [
  {
    title: 'Photographer Auth',
    icon: Camera,
    keys: {
      emailVerification: 'photographer_email_verification_enabled',
      phoneAuth: 'photographer_phone_auth_enabled',
      emailTemplate: 'photographer_email_otp_template',
      phoneTemplate: 'photographer_phone_otp_template',
      googleLogin: 'photographer_google_login_enabled',
      facebookLogin: 'photographer_facebook_login_enabled',
      appleLogin: 'photographer_apple_login_enabled',
    },
  },
  {
    title: 'Client Auth',
    icon: Phone,
    keys: {
      emailVerification: 'user_email_verification_enabled',
      phoneAuth: 'user_phone_auth_enabled',
      emailTemplate: 'user_email_otp_template',
      phoneTemplate: 'user_phone_otp_template',
      googleLogin: 'user_google_login_enabled',
      facebookLogin: 'user_facebook_login_enabled',
      appleLogin: 'user_apple_login_enabled',
    },
  },
];

const CONFIG_SECTIONS = [
  {
    title: 'SMTP Email Provider',
    icon: Mail,
    keys: ['smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from'],
  },
  {
    title: 'SendGrid Email Provider',
    icon: Mail,
    keys: ['sendgrid_enabled', 'sendgrid_api_key', 'sendgrid_from'],
  },
  {
    title: 'Twilio Email Provider',
    icon: Mail,
    keys: ['twilio_email_enabled', 'twilio_email_api_key', 'twilio_email_from'],
  },
  {
    title: 'Fast2SMS Provider',
    icon: Phone,
    keys: ['fast2sms_enabled', 'fast2sms_api_key', 'fast2sms_sender_id'],
  },
  {
    title: 'BulkSMS Provider',
    icon: Phone,
    keys: ['bulksms_enabled', 'bulksms_username', 'bulksms_api_key', 'bulksms_sender_id'],
  },
];

const FACE_ANALYSIS_CONFIG_KEYS = [
  'face_analysis_enabled',
  'face_analysis_backend_url',
  'face_analysis_api_key',
  'face_detection_mode',
  'face_indexing_image_source',
  'face_indexing_shared_storage_path',
  'face_min_confidence',
  'face_search_default_top_k',
  'face_search_min_similarity'
];

const FACE_ANALYSIS_ADVANCED_KEYS = [
  'compreface_url',
  'compreface_recognition_api_key',
  'compreface_detection_api_key',
  'face_python_sidecar_url',
  'face_enable_fallback_detection',
  'face_enable_alignment'
];

const GENERAL_CONFIG_SECTIONS = [
  {
    title: 'Organization Identity',
    description: 'Identifier used for multi-tenant services',
    icon: Shield,
    keys: ['organization_id']
  },
  {
    title: 'Storage Settings',
    icon: Save,
    keys: ['storage_provider', 'storage_local_path', 'storage_local_base_url', 'storage_s3_bucket', 'storage_s3_region', 'storage_s3_access_key', 'storage_s3_secret_key', 'storage_s3_endpoint']
  },
  {
    title: 'Upload Settings',
    icon: FileText,
    keys: ['upload_chunk_size_mb', 'upload_max_file_size_mb', 'upload_session_expiry_hours', 'upload_concurrent_processing', 'upload_allowed_types']
  },
  {
    title: 'Thumbnail Settings',
    icon: Camera,
    keys: ['thumbnail_max_dimension', 'thumbnail_quality', 'thumbnail_format']
  },
  {
    title: 'Event Deletion',
    icon: Trash2,
    keys: ['event_deletion_mode', 'storage_trash_path']
  }
];

// ==================== CONFIG FIELD COMPONENT ====================

interface ConfigFieldProps {
  fieldKey: string;
  config: { value: string; options: string[] | null } | undefined;
  schema: ConfigFieldDef;
  onChange: (value: string) => void;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  configs: ConfigData; // Needed for condition check
}

function ConfigField({ fieldKey, config, schema, onChange, showPassword, onTogglePassword, configs }: ConfigFieldProps) {
  // Check visibility condition
  if (schema.condition && !schema.condition(configs)) {
    return null;
  }

  const value = config?.value || '';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-slate-700 dark:text-slate-300">{schema.label}</Label>
        {schema.tooltip && (
          <Tooltip content={schema.tooltip}>
            <Info className="h-4 w-4 text-slate-400 cursor-help" />
          </Tooltip>
        )}
      </div>

      {schema.type === 'select' && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
        >
          {schema.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {schema.type === 'multiselect' && (
        <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800/50">
          {schema.options?.map(opt => {
            const selectedValues = value ? value.split(',') : [];
            const isSelected = selectedValues.includes(opt.value);

            return (
              <label key={opt.value} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const currentValues = value ? value.split(',').filter(v => v) : [];
                    const newValues = e.target.checked
                      ? [...currentValues, opt.value]
                      : currentValues.filter(v => v !== opt.value);
                    onChange(newValues.join(','));
                  }}
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
              </label>
            );
          })}
          {value && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">
                {value.split(',').filter(v => v).length} selected
              </p>
            </div>
          )}
        </div>
      )}

      {schema.type === 'text' && (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={schema.placeholder}
        />
      )}

      {schema.type === 'password' && (
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={schema.placeholder}
            className="pr-10"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      )}

      {schema.type === 'boolean' && (
        <div className="flex items-center space-x-2">
          <Switch checked={value === 'true'} onCheckedChange={(v) => onChange(v ? 'true' : 'false')} />
          <span className="text-sm text-slate-500">{value === 'true' ? 'Enabled' : 'Disabled'}</span>
        </div>
      )}
    </div>
  );
}

// Template List Item Component with preview capability
function TemplateListItem({ template, onToggle, onDelete, onEdit }: { template: Template; onToggle: (t: Template) => void; onDelete: (id: string) => void; onEdit: (t: Template) => void }) {
  const [showPreview, setShowPreview] = useState(false);

  const getPreviewHtml = useMemo(() => {
    if (!template.templateText || !template.isHtml) return '';
    let html = template.templateText;
    const vars = TEMPLATE_VARIABLES[template.type] || [];
    vars.forEach(v => {
      const regex = new RegExp(`{{\\s*${v.name}\\s*}}`, 'g');
      html = html.replace(regex, `<span style="background:#fef3c7;padding:2px 4px;border-radius:4px;">${v.sample}</span>`);
    });
    return html;
  }, [template.templateText, template.type, template.isHtml]);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-slate-900 dark:text-white font-medium">{template.name}</h4>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{template.type}</span>
              {template.provider && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">{template.provider}</span>
              )}
              {template.isHtml && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Code className="h-3 w-3" /> HTML
                </span>
              )}
              {template.isActive && <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">Active</span>}
            </div>
            {template.templateId && <p className="text-xs text-slate-500 mt-1">DLT Template ID: {template.templateId}</p>}

            {/* Show code or text */}
            {!template.isHtml ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-mono bg-slate-100 dark:bg-slate-800/50 p-2 rounded break-all">{template.templateText}</p>
            ) : (
              <div className="mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1 mb-2">
                  <Eye className="h-3 w-3" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
                {showPreview ? (
                  <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-500 border-b border-slate-300 dark:border-slate-700">Preview</div>
                    <iframe
                      srcDoc={getPreviewHtml}
                      className="w-full h-[400px] bg-white border-0"
                      sandbox="allow-same-origin"
                      title="Email Preview"
                    />
                  </div>
                ) : (
                  <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/50 p-2 rounded overflow-x-auto overflow-y-auto max-h-[100px] whitespace-pre-wrap break-all">{template.templateText}</pre>
                )}
              </div>
            )}

            {template.variables.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">Variables: {template.variables.join(', ')}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => onEdit(template)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggle(template)} className={template.isActive ? 'text-green-600 dark:text-green-400' : ''}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(template.id)} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useQueryTabs('authentication', 'tab');
  const [authSubTab, setAuthSubTab] = useQueryTabs('settings', 'subtab');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<ConfigData>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'EMAIL_OTP', provider: 'smtp', templateId: '', templateText: '', variables: '', isHtml: false });
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editForm, setEditForm] = useState({ name: '', templateId: '', templateText: '', variables: '', isHtml: false });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'Photographer Auth': true, 'Client Auth': true });
  const [enabledProviders, setEnabledProviders] = useState<{ emailProviders: string[]; smsProviders: string[] }>({ emailProviders: [], smsProviders: [] });
  const [showPreview, setShowPreview] = useState(false);
  const [showEditPreview, setShowEditPreview] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Check if current template type is email
  const isEmailType = (type: string) => type.startsWith('EMAIL_');

  // Get rendered preview with sample values
  const getPreviewHtml = useMemo(() => {
    if (!newTemplate.templateText) return '';
    let html = newTemplate.templateText;
    const vars = TEMPLATE_VARIABLES[newTemplate.type] || [];
    vars.forEach(v => {
      const regex = new RegExp(`{{\\s*${v.name}\\s*}}`, 'g');
      html = html.replace(regex, `<span style="background:#fef3c7;padding:2px 4px;border-radius:4px;">${v.sample}</span>`);
    });
    return html;
  }, [newTemplate.templateText, newTemplate.type]);

  // Get rendered preview for edit form
  const getEditPreviewHtml = useMemo(() => {
    if (!editForm.templateText || !editingTemplate) return '';
    let html = editForm.templateText;
    const vars = TEMPLATE_VARIABLES[editingTemplate.type] || [];
    vars.forEach(v => {
      const regex = new RegExp(`{{\\s*${v.name}\\s*}}`, 'g');
      html = html.replace(regex, `<span style="background:#fef3c7;padding:2px 4px;border-radius:4px;">${v.sample}</span>`);
    });
    return html;
  }, [editForm.templateText, editingTemplate]);

  // Insert variable at cursor position
  const insertVariable = (varName: string) => {
    setNewTemplate(prev => ({
      ...prev,
      templateText: prev.templateText + `{{${varName}}}`
    }));
  };

  // Insert variable in edit form
  const insertEditVariable = (varName: string) => {
    setEditForm(prev => ({
      ...prev,
      templateText: prev.templateText + `{{${varName}}}`
    }));
  };

  // Start editing a template
  const startEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name,
      templateId: template.templateId || '',
      templateText: template.templateText,
      variables: template.variables.join(', '),
      isHtml: template.isHtml,
    });
    setShowEditPreview(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingTemplate(null);
    setEditForm({ name: '', templateId: '', templateText: '', variables: '', isHtml: false });
    setShowEditPreview(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('superAdminToken');
    try {
      const [authRes, templatesRes, providersRes] = await Promise.all([
        fetch('http://localhost:4000/api/v1/config/auth', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/v1/config/templates', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/v1/config/providers', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const authData = await authRes.json();
      const templatesData = await templatesRes.json();
      const providersData = await providersRes.json();
      if (authData.success) setConfigs(authData.data);
      if (templatesData.success) setTemplates(templatesData.data);
      if (providersData.success) setEnabledProviders(providersData.data);
    } catch (err) { console.error('Failed to fetch config:', err); }
    setLoading(false);
  };

  // Update a single config value locally
  const updateConfig = (key: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  // Save all configs
  const saveConfigs = async () => {
    setSaving(true);
    const token = localStorage.getItem('superAdminToken');
    // Convert configs to simple key-value object for API
    const data: Record<string, string> = {};
    Object.entries(configs).forEach(([key, config]) => {
      data[key] = config.value;
    });
    try {
      const res = await fetch('http://localhost:4000/api/v1/config/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setConfigs(result.data);
        // Refresh enabled providers
        const providersRes = await fetch('http://localhost:4000/api/v1/config/providers', { headers: { Authorization: `Bearer ${token}` } });
        const providersData = await providersRes.json();
        if (providersData.success) setEnabledProviders(providersData.data);
      }
    } catch (err) { console.error('Failed to save config:', err); }
    setSaving(false);
  };

  const createTemplate = async () => {
    const token = localStorage.getItem('superAdminToken');
    const res = await fetch('http://localhost:4000/api/v1/config/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...newTemplate,
        variables: newTemplate.variables.split(',').map(v => v.trim()).filter(Boolean)
      }),
    });
    const data = await res.json();
    if (data.success) {
      setTemplates([data.data, ...templates]);
      setNewTemplate({ name: '', type: 'EMAIL_OTP', provider: 'smtp', templateId: '', templateText: '', variables: '', isHtml: false });
      setShowNewTemplate(false);
      setShowPreview(false);
    }
  };

  // Get enabled providers for template dropdown
  const getEnabledProvidersForType = (type: string) => {
    if (isSmsType(type)) {
      return enabledProviders.smsProviders.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }));
    }
    return enabledProviders.emailProviders.map(p => ({ value: p, label: p.toUpperCase() }));
  };

  // Handle type change - update provider to first enabled provider and reset isHtml for SMS
  const handleTypeChange = (type: string) => {
    const providers = getEnabledProvidersForType(type);
    const defaultProvider = providers[0]?.value || (isSmsType(type) ? 'fast2sms' : 'smtp');
    setNewTemplate({ ...newTemplate, type, provider: defaultProvider, isHtml: isSmsType(type) ? false : newTemplate.isHtml });
  };

  const toggleTemplateActive = async (template: Template) => {
    const token = localStorage.getItem('superAdminToken');
    await fetch(`http://localhost:4000/api/v1/config/templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !template.isActive }),
    });
    // When activating, deactivate others of same type and provider
    setTemplates(templates.map(t =>
      (t.type === template.type && t.provider === template.provider)
        ? { ...t, isActive: t.id === template.id ? !t.isActive : false }
        : t
    ));
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const token = localStorage.getItem('superAdminToken');
    await fetch(`http://localhost:4000/api/v1/config/templates/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setTemplates(templates.filter(t => t.id !== id));
  };

  // Update template
  const updateTemplate = async () => {
    if (!editingTemplate) return;
    const token = localStorage.getItem('superAdminToken');
    const res = await fetch(`http://localhost:4000/api/v1/config/templates/${editingTemplate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: editForm.name,
        templateId: editForm.templateId,
        templateText: editForm.templateText,
        variables: editForm.variables.split(',').map(v => v.trim()).filter(Boolean),
        isHtml: editForm.isHtml,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? data.data : t));
      cancelEdit();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  // Helper to render auth toggle + template selector
  const renderAuthToggle = (toggleKey: string, templateKey: string, templateList: Template[], label: string) => {
    const toggleSchema = CONFIG_SCHEMA[toggleKey];
    const templateSchema = CONFIG_SCHEMA[templateKey];
    if (!toggleSchema || !templateSchema) return null;

    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-slate-900 dark:text-white font-medium">{label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{toggleSchema.tooltip}</p>
            </div>
            {toggleSchema.tooltip && (
              <Tooltip content={toggleSchema.tooltip}>
                <Info className="h-4 w-4 text-slate-400 cursor-help" />
              </Tooltip>
            )}
          </div>
          <Switch
            checked={configs[toggleKey]?.value === 'true'}
            onCheckedChange={(v) => updateConfig(toggleKey, v ? 'true' : 'false')}
          />
        </div>
        {configs[toggleKey]?.value === 'true' && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Label className="text-slate-700 dark:text-slate-300">{templateSchema.label}</Label>
              {templateSchema.tooltip && (
                <Tooltip content={templateSchema.tooltip}>
                  <Info className="h-4 w-4 text-slate-400 cursor-help" />
                </Tooltip>
              )}
            </div>
            <select
              value={configs[templateKey]?.value || ''}
              onChange={(e) => updateConfig(templateKey, e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">Select a template</option>
              {templateList.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
              ))}
            </select>
            {templateList.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">No templates found. Create one in the Templates tab.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">System Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure system-wide settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="authentication"><Shield className="h-4 w-4 mr-2" />Authentication</TabsTrigger>
          <TabsTrigger value="face-analysis"><Brain className="h-4 w-4 mr-2" />Face Analysis</TabsTrigger>
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-2" />General</TabsTrigger>
        </TabsList>

        <TabsContent value="authentication" className="space-y-4 mt-4">
          <Tabs value={authSubTab} onValueChange={setAuthSubTab}>
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4 mt-4">
              {ENTITY_AUTH_CONFIGS.map((entityConfig) => {
                const IconComponent = entityConfig.icon;
                const isExpanded = expandedSections[entityConfig.title];
                const emailTemplates = templates.filter(t => t.type.startsWith('EMAIL_'));
                const phoneTemplates = templates.filter(t => t.type.startsWith('SMS_'));

                return (
                  <Card key={entityConfig.title} className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      onClick={() => toggleSection(entityConfig.title)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                        <IconComponent className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                        <span className="text-slate-900 dark:text-white font-medium">{entityConfig.title}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <CardContent className="pt-0 border-t border-slate-200 dark:border-slate-700">
                        <div className="space-y-4 pt-4">
                          {renderAuthToggle(entityConfig.keys.emailVerification, entityConfig.keys.emailTemplate, emailTemplates, 'Email Verification')}
                          {renderAuthToggle(entityConfig.keys.phoneAuth, entityConfig.keys.phoneTemplate, phoneTemplates, 'Phone Auth (Login/Signup)')}

                          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg space-y-3">
                            <div>
                              <p className="text-slate-900 dark:text-white font-medium">Social Login Options</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Enable social login providers for signup</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                              {['googleLogin', 'facebookLogin', 'appleLogin'].map(providerKey => {
                                const key = entityConfig.keys[providerKey as keyof typeof entityConfig.keys];
                                return (
                                  <ConfigField
                                    key={key}
                                    fieldKey={key}
                                    config={configs[key]}
                                    schema={CONFIG_SCHEMA[key]}
                                    onChange={(val) => updateConfig(key, val)}
                                    configs={configs}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              {CONFIG_SECTIONS.map((section) => {
                const IconComponent = section.icon;
                const isExpanded = expandedSections[section.title];
                const hasEnabledKey = section.keys.find(k => k.endsWith('_enabled'));
                const isEnabled = hasEnabledKey ? configs[hasEnabledKey]?.value === 'true' : true;

                return (
                  <Card key={section.title} className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      onClick={() => toggleSection(section.title)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                        <IconComponent className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                        <span className="text-slate-900 dark:text-white font-medium">{section.title}</span>
                      </div>
                      {hasEnabledKey && (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(v) => updateConfig(hasEnabledKey, v ? 'true' : 'false')}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                    {isExpanded && (
                      <CardContent className="pt-0 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          {section.keys.filter(k => !k.endsWith('_enabled')).map((key) => (
                            <ConfigField
                              key={key}
                              fieldKey={key}
                              config={configs[key]}
                              schema={CONFIG_SCHEMA[key] || { label: key, type: 'text' }}
                              onChange={(val) => updateConfig(key, val)}
                              showPassword={visiblePasswords[key]}
                              onTogglePassword={() => setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }))}
                              configs={configs}
                            />
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              <div className="flex justify-end">
                <Button onClick={saveConfigs} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-600 dark:text-slate-400">Manage message templates for OTP and notifications</p>
                <Button onClick={() => setShowNewTemplate(!showNewTemplate)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Plus className="h-4 w-4" /> Add Template
                </Button>
              </div>

              {showNewTemplate && (
                <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <CardHeader><CardTitle className="text-slate-900 dark:text-white">New Template</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="OTP Email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <select value={newTemplate.type} onChange={(e) => handleTypeChange(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                          {TEMPLATE_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        {getEnabledProvidersForType(newTemplate.type).length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">No providers enabled. Enable at least one in Settings tab.</p>
                        ) : (
                          <select value={newTemplate.provider} onChange={(e) => setNewTemplate({ ...newTemplate, provider: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                            {getEnabledProvidersForType(newTemplate.type).map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Template ID (Provider-specific)</Label>
                      <Input value={newTemplate.templateId} onChange={(e) => setNewTemplate({ ...newTemplate, templateId: e.target.value })} placeholder="Optional" />
                    </div>

                    {isEmailType(newTemplate.type) && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-slate-500" />
                          <Label className="text-sm">HTML Template</Label>
                        </div>
                        <Switch
                          checked={newTemplate.isHtml}
                          onCheckedChange={(v) => setNewTemplate({ ...newTemplate, isHtml: v })}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600 dark:text-slate-400">Available Variables (click to insert)</Label>
                      <div className="flex flex-wrap gap-2">
                        {(TEMPLATE_VARIABLES[newTemplate.type] || []).map((v) => (
                          <Button
                            key={v.name}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariable(v.name)}
                            className="text-xs gap-1"
                            title={v.description}
                          >
                            <Copy className="h-3 w-3" />
                            {`{{${v.name}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{newTemplate.isHtml ? 'HTML Content' : 'Template Text'}</Label>
                        {newTemplate.isHtml && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreview(!showPreview)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                          </Button>
                        )}
                      </div>
                      <textarea
                        value={newTemplate.templateText}
                        onChange={(e) => setNewTemplate({ ...newTemplate, templateText: e.target.value })}
                        rows={newTemplate.isHtml ? 10 : 3}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white resize-none font-mono text-sm"
                        placeholder={newTemplate.isHtml
                          ? `<!DOCTYPE html>\n<html>\n<body>\n  <h1>Verify Your Email</h1>\n  <p>Your OTP is <strong>{{otp}}</strong></p>\n  <p>Valid for {{validMinutes}} minutes.</p>\n</body>\n</html>`
                          : 'Your OTP is {{otp}}. Valid for {{validMinutes}} minutes.'}
                      />
                    </div>

                    {newTemplate.isHtml && showPreview && (
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-600 dark:text-slate-400">Preview (with sample values)</Label>
                        <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-500 border-b border-slate-300 dark:border-slate-700">
                            Email Preview
                          </div>
                          <iframe
                            srcDoc={getPreviewHtml}
                            className="w-full h-[400px] bg-white border-0"
                            sandbox="allow-same-origin"
                            title="Email Preview"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Variables (comma-separated)</Label>
                      <Input value={newTemplate.variables} onChange={(e) => setNewTemplate({ ...newTemplate, variables: e.target.value })} placeholder="otp, validMinutes, userName" />
                      <p className="text-xs text-slate-500">Auto-filled from template. You can add custom variables here.</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setShowNewTemplate(false); setShowPreview(false); }}>Cancel</Button>
                      <Button onClick={createTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Create</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {editingTemplate && (
                <Card className="bg-white dark:bg-slate-900/50 border-indigo-300 dark:border-indigo-700 border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                        <Pencil className="h-5 w-5 text-indigo-500" />
                        Edit Template: {editingTemplate.name}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">Type: {editingTemplate.type} | Provider: {editingTemplate.provider || 'N/A'}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>DLT Template ID (Provider-specific)</Label>
                        <Input value={editForm.templateId} onChange={(e) => setEditForm({ ...editForm, templateId: e.target.value })} placeholder="e.g., 1234567890123456789" />
                      </div>
                    </div>

                    {isEmailType(editingTemplate.type) && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-slate-500" />
                          <Label className="text-sm">HTML Template</Label>
                        </div>
                        <Switch
                          checked={editForm.isHtml}
                          onCheckedChange={(v) => setEditForm({ ...editForm, isHtml: v })}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600 dark:text-slate-400">Available Variables (click to insert)</Label>
                      <div className="flex flex-wrap gap-2">
                        {(TEMPLATE_VARIABLES[editingTemplate.type] || []).map((v) => (
                          <Button
                            key={v.name}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertEditVariable(v.name)}
                            className="text-xs gap-1"
                            title={v.description}
                          >
                            <Copy className="h-3 w-3" />
                            {`{{${v.name}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{editForm.isHtml ? 'HTML Content' : 'Template Text'}</Label>
                        {editForm.isHtml && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEditPreview(!showEditPreview)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {showEditPreview ? 'Hide Preview' : 'Show Preview'}
                          </Button>
                        )}
                      </div>
                      <textarea
                        value={editForm.templateText}
                        onChange={(e) => setEditForm({ ...editForm, templateText: e.target.value })}
                        rows={editForm.isHtml ? 10 : 3}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white resize-none font-mono text-sm"
                      />
                    </div>

                    {editForm.isHtml && showEditPreview && (
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-600 dark:text-slate-400">Preview (with sample values)</Label>
                        <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-500 border-b border-slate-300 dark:border-slate-700">
                            Email Preview
                          </div>
                          <iframe
                            srcDoc={getEditPreviewHtml}
                            className="w-full h-[400px] bg-white border-0"
                            sandbox="allow-same-origin"
                            title="Email Preview"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Variables (comma-separated)</Label>
                      <Input value={editForm.variables} onChange={(e) => setEditForm({ ...editForm, variables: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                      <Button onClick={updateTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Save className="h-4 w-4" /> Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {templates.length === 0 ? (
                  <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <CardContent className="py-8 text-center">
                      <FileText className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">No templates yet. Add your first template.</p>
                    </CardContent>
                  </Card>
                ) : (
                  templates.map((template) => (
                    <TemplateListItem key={template.id} template={template} onToggle={toggleTemplateActive} onDelete={deleteTemplate} onEdit={startEditTemplate} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="face-analysis" className="space-y-4 mt-4">
          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Brain className="h-5 w-5 text-indigo-500" />
                    Face Analysis API
                  </CardTitle>
                  <CardDescription>Configure connection to face analysis backend</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key Field */}
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">API Key</Label>
                <div className="relative">
                  <Input
                    type={visiblePasswords['face_analysis_api_key'] ? 'text' : 'password'}
                    value={configs['face_analysis_api_key']?.value || ''}
                    onChange={(e) => updateConfig('face_analysis_api_key', e.target.value)}
                    placeholder="Enter face analysis API key"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePasswords(prev => ({ ...prev, face_analysis_api_key: !prev['face_analysis_api_key'] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {visiblePasswords['face_analysis_api_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Test Connection Button */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:4000/api/v1/config/test-face-analysis', {
                        method: 'GET',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                      });

                      const data = await response.json();

                      if (data.success) {
                        toast.success(data.data.message || 'Connection successful!');
                      } else {
                        toast.error(data.data.message || 'Connection failed');
                      }
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to test connection');
                    }
                  }}
                  className="w-full"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4 mt-4">
          {GENERAL_CONFIG_SECTIONS.map((section) => {
            const IconComponent = section.icon;
            const isExpanded = expandedSections[section.title] ?? true;

            return (
              <Card key={section.title} className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  onClick={() => toggleSection(section.title)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    <IconComponent className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-900 dark:text-white font-medium">{section.title}</span>
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="pt-0 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      {section.keys.map((key) => (
                        <ConfigField
                          key={key}
                          fieldKey={key}
                          config={configs[key]}
                          schema={CONFIG_SCHEMA[key] || { label: key, type: 'text' }}
                          onChange={(val) => updateConfig(key, val)}
                          showPassword={visiblePasswords[key]}
                          onTogglePassword={() => setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }))}
                          configs={configs}
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          <div className="flex justify-end">
            <Button onClick={saveConfigs} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>
      </Tabs >
    </div >
  );
}


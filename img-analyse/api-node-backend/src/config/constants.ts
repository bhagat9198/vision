export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUTH = {
  SALT_ROUNDS: 10,
  TOKEN_TYPE: 'Bearer',
} as const;

export const FILE = {
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  THUMBNAIL_WIDTH: 400,
  THUMBNAIL_QUALITY: 80,
} as const;

export const STORAGE = {
  FREE_LIMIT: 5 * 1024 * 1024 * 1024, // 5GB
  PRO_LIMIT: 50 * 1024 * 1024 * 1024, // 50GB
  BUSINESS_LIMIT: 500 * 1024 * 1024 * 1024, // 500GB
} as const;


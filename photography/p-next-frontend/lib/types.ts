export type GalleryTemplate = 'modern' | 'classic' | 'minimal' | 'elegant' | 'fashion' | 'sidebar';

export interface Event {
  id: string;
  displayId: number;
  name: string;
  photographerId: string;
  coverPhoto: string;
  date: string;
  location: string;
  isPasswordProtected: boolean;
  password: string | null;
  instructions: string | null;
  totalPhotos: number;
  status: 'draft' | 'published' | 'archived';
  template?: GalleryTemplate;
}

export interface Photographer {
  id: string;
  displayId: number;
  name: string;
  avatar: string;
  bio: string;
  website: string;
  instagram: string;
}

export interface Album {
  id: string;
  displayId: number;
  eventId: string;
  name: string;
  coverPhoto: string;
  photoCount: number;
}

export interface Photo {
  id: string;
  displayId?: number;
  albumId: string | null;
  eventId: string;
  url: string;
  thumbnail: string;
  likes: number;
  comments: number;
  aspectRatio: 'portrait' | 'landscape' | 'square';
  downloadable?: boolean;
  timestamp?: string;
}

export interface Comment {
  id: string;
  photoId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

export interface PersonTag {
  id: string;
  photoId: string;
  name: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  thumbnail: string;
  photoCount: number;
}

export interface SimilarPhoto {
  id: string;
  photoId: string;
  similarPhotoId: string;
  similarity: number;
  reason: 'face' | 'scene' | 'color' | 'clothing';
}

// AI Search Types
export interface DetectedFace {
  id: string;
  eventId: string;
  name: string;
  thumbnail: string;
  photoCount: number;
  samplePhotoIds: string[];
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  photoCount: number;
}

export interface OutfitType {
  id: string;
  name: string;
  icon: string;
  photoCount: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  category: 'scene' | 'people' | 'activity' | 'emotion';
}

export type SearchMode = 'face' | 'color' | 'prompt';

export interface SearchResult {
  photos: Photo[];
  query: string;
  mode: SearchMode;
  confidence?: number;
}

// Favorites Types
export interface FavoriteFolder {
  id: string;
  eventId: string;
  name: string;
  color: string;
  photoIds: string[];
  createdAt: string;
}

export interface FavoritePhoto {
  id: string;
  eventId: string;
  photoId: string;
  folderId: string | null;
  addedAt: string;
}

// Download Center Types
export interface DownloadSize {
  id: string;
  name: string;
  label: string;
  dimensions: string;
  estimatedSize: string;
  pricePerPhoto?: number;
}

export interface DownloadPackage {
  id: string;
  eventId: string;
  name: string;
  description: string;
  photoCount: number;
  totalSize: string;
  expiresAt: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'ready' | 'expired';
  downloadUrl?: string;
  sizeOption: string;
}

export interface DownloadSettings {
  eventId: string;
  maxDownloadsPerUser: number;
  allowedSizes: string[];
  expiryDays: number;
  watermarkEnabled: boolean;
}

// Photographer Portal Types
export interface PhotographerStats {
  totalEvents: number;
  totalPhotos: number;
  storageUsed: string;
  storageLimit: string;
  totalViews: number;
  totalDownloads: number;
  totalLikes: number;
  totalComments: number;
}

export interface ActivityItem {
  id: string;
  type: 'comment' | 'like' | 'download' | 'view' | 'upload';
  eventId: string;
  eventName: string;
  photoId?: string;
  clientName?: string;
  message: string;
  timestamp: string;
}

export interface EventSettings {
  accessType: 'open' | 'restricted' | 'password';
  password?: string;
  allowedEmails?: string[];
  galleryTemplate: 'modern' | 'classic' | 'minimal' | 'elegant';
  watermarkEnabled: boolean;
  allowDownloads: boolean;
  allowComments: boolean;
  allowLikes: boolean;
}

export interface ClientVisit {
  id: string;
  eventId: string;
  clientName: string;
  clientEmail?: string;
  visitedAt: string;
  photosViewed: number;
  photosLiked: number;
  photosDownloaded: number;
  commentsLeft: number;
}

export interface PhotographerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  bio: string;
  website?: string;
  instagram?: string;
  subscription: 'free' | 'pro' | 'business';
  storageUsed: number;
  storageLimit: number;
  watermarkUrl?: string;
  defaultTemplate: string;
  notificationSettings: {
    emailOnComment: boolean;
    emailOnDownload: boolean;
    emailOnNewClient: boolean;
    pushNotifications: boolean;
  };
}

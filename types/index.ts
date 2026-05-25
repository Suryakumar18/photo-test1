export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "photographer" | "client";
  studioId?: string;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photographer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  specialization?: string;
  eventsCount: number;
  createdAt: Date;
}

export interface Event {
  _id: string;
  title: string;
  slug: string;
  brideName: string;
  groomName: string;
  eventDate: Date;
  location: string;
  coverImage?: string;
  coverImageCDN?: string;
  photographers: string[];
  qrCode?: string;
  shareUrl: string;
  status: "upcoming" | "live" | "completed" | "archived";
  photosCount: number;
  videosCount: number;
  viewsCount: number;
  faceMatchCount: number;
  storageUsed: number;
  isPublic: boolean;
  password?: string;
  description?: string;
  tags?: string[];
  studioId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  _id: string;
  eventId: string;
  studioId?: string;
  filename: string;
  originalName: string;
  url: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
  uploadedBy: string;
  tags?: string[];
  faces?: Face[];
  favorites: number;
  downloads: number;
  isProcessed: boolean;
  hasFaces: boolean;
  metadata?: PhotoMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  _id: string;
  eventId: string;
  filename: string;
  originalName: string;
  url: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  size: number;
  mimeType: string;
  uploadedBy: string;
  isProcessed: boolean;
  createdAt: Date;
}

export interface Face {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  embedding?: number[];
}

export interface FaceEmbedding {
  _id: string;
  photoId: string;
  eventId: string;
  embedding: number[];
  boundingBox: Face["boundingBox"];
  confidence: number;
  createdAt: Date;
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  takenAt?: Date;
  gps?: {
    lat: number;
    lng: number;
  };
}

export interface Favorite {
  _id: string;
  userId: string;
  photoId: string;
  eventId: string;
  createdAt: Date;
}

export interface DownloadHistory {
  _id: string;
  userId?: string;
  photoId: string;
  eventId: string;
  ip?: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalEvents: number;
  totalPhotos: number;
  totalVideos: number;
  storageUsed: number;
  totalVisitors: number;
  faceMatchUsers: number;
  liveUploads: number;
  revenue: number;
  recentEvents: Event[];
  recentPhotos: Photo[];
  activityTimeline: Activity[];
  uploadTrend: ChartData[];
  visitorTrend: ChartData[];
}

export interface Activity {
  _id: string;
  type: "upload" | "event_created" | "face_match" | "download" | "view";
  description: string;
  user?: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ChartData {
  date: string;
  value: number;
  label?: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  url?: string;
  error?: string;
}

export interface FaceMatchResult {
  photoId: string;
  photo: Photo;
  similarity: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GalleryFilter {
  search?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  hasFaces?: boolean;
  sortBy?: "newest" | "oldest" | "popular";
}

// ── SaaS / Multi-tenant ──────────────────────────────────────────────────────

export type StudioPlan = "trial" | "starter" | "professional" | "enterprise";
export type StudioStatus = "active" | "suspended" | "trial" | "pending";

export interface Studio {
  _id: string;
  studioId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  address?: string;
  logo?: string;
  plan: StudioPlan;
  status: StudioStatus;
  storageLimit: number;
  storageUsed: number;
  photosCount: number;
  eventsCount: number;
  usersCount: number;
  settings: {
    allowFaceMatch: boolean;
    allowPublicGallery: boolean;
    customDomain?: string;
    watermark?: string;
  };
  subscription: {
    startDate: Date;
    endDate?: Date;
    autoRenew: boolean;
  };
  lastActivity?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformStats {
  totalStudios: number;
  activeStudios: number;
  trialStudios: number;
  suspendedStudios: number;
  totalPhotos: number;
  totalEvents: number;
  totalUsers: number;
  totalStorageUsed: number;
  newStudiosThisWeek: number;
  storageByPlan: Array<{ _id: string; count: number; storage: number }>;
  studioGrowth: ChartData[];
  topStudios: Array<{
    studioId: string;
    name: string;
    storageUsed: number;
    storageLimit: number;
    photosCount: number;
    eventsCount: number;
    status: StudioStatus;
    plan: StudioPlan;
  }>;
}

export interface ActivityLog {
  _id: string;
  studioId: string;
  type: string;
  description: string;
  userId?: string;
  eventId?: string;
  photoId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

export interface LiveAnalyticsData {
  timestamp: string;
  totalStudios: number;
  activeStudios: number;
  totalPhotos: number;
  totalStorageUsed: number;
  totalStorageLimit: number;
  uploadsLastMinute: number;
  uploadsLastHour: number;
  uploadsLast24h: number;
  activeEventsCount: number;
  recentActivity: ActivityLog[];
  studioBreakdown: Array<{
    studioId: string;
    name: string;
    storageUsed: number;
    storageLimit: number;
    status: StudioStatus;
    photosCount: number;
    eventsCount: number;
  }>;
  hourlyUploads: Array<{ time: string; count: number }>;
}

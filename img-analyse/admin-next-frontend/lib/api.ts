import type {
  ApiResponse,
  HealthCheckResponse,
  Organization,
  OrganizationListItem,
  CreateOrgRequest,
  CreateOrgResponse,
  GlobalSettings,
  ApiKeyListItem,
  EventStats,
  OrgCollectionsResponse,
  AllCollectionsResponse,
  VideoWithFrames,
  PhotoFacesResponse,
  PersonCluster,
  ClusteringJob,
  ClusterListResponse,
  ClusterFacesResponse,
  RunClusteringResponse,
  ImageStatus,
} from "./types";

// =============================================================================
// API Configuration
// =============================================================================

import Cookies from '@/node_modules/@types/js-cookie';

// ... (imports remain the same) ...

export const API_BASE_URL = process.env.NEXT_PUBLIC_IMG_ANALYSE_API_URL || "http://localhost:3002";
const AUTH_TOKEN_KEY = 'img-analyse-auth-token';

class ApiClient {
  private masterKey: string | null = null;
  private apiKey: string | null = null;
  private authToken: string | null = null;

  setMasterKey(key: string) {
    this.masterKey = key;
    if (typeof window !== "undefined") {
      localStorage.setItem("img-analyse-master-key", key);
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== "undefined") {
      localStorage.setItem("img-analyse-api-key", key);
    }
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    if (this.authToken) return this.authToken;
    // Fallback to cookie
    return Cookies.get(AUTH_TOKEN_KEY) || null;
  }

  getMasterKey(): string | null {
    if (this.masterKey) return this.masterKey;
    if (typeof window !== "undefined") {
      return localStorage.getItem("img-analyse-master-key");
    }
    return null;
  }

  getApiKey(): string | null {
    if (this.apiKey) return this.apiKey;
    if (typeof window !== "undefined") {
      return localStorage.getItem("img-analyse-api-key");
    }
    return null;
  }

  clearKeys() {
    this.masterKey = null;
    this.apiKey = null;
    this.authToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("img-analyse-master-key");
      localStorage.removeItem("img-analyse-api-key");
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    useMasterKey = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (useMasterKey && this.getMasterKey()) {
      headers["x-master-key"] = this.getMasterKey()!;
    } else if (this.getApiKey()) {
      headers["x-api-key"] = this.getApiKey()!;
    }

    const authToken = this.getAuthToken();
    if (authToken) {
      headers["x-auth-token"] = authToken;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // ===========================================================================
  // Health Endpoints
  // ===========================================================================

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request("/health");
  }

  async getDetailedHealth(): Promise<HealthCheckResponse> {
    return this.request("/health/detailed");
  }

  // ===========================================================================
  // Organization Endpoints
  // ===========================================================================

  async listOrganizations(): Promise<ApiResponse<OrganizationListItem[]>> {
    return this.request("/orgs", {}, false);
  }

  async getOrganization(id: string): Promise<ApiResponse<Organization>> {
    return this.request(`/orgs/${id}`);
  }

  async getOrgSettings(id: string): Promise<ApiResponse<Organization>> {
    return this.request(`/orgs/${id}/settings`);
  }

  async createOrganization(data: CreateOrgRequest): Promise<ApiResponse<CreateOrgResponse>> {
    return this.request("/orgs/register", {
      method: "POST",
      body: JSON.stringify(data),
    }, false);
  }

  async updateOrgSettings(id: string, settings: Partial<Organization>): Promise<ApiResponse<Organization>> {
    return this.request(`/orgs/${id}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  // ===========================================================================
  // Global Settings Endpoints
  // ===========================================================================

  async getGlobalSettings(): Promise<ApiResponse<GlobalSettings>> {
    return this.request("/settings/global", {}, false);
  }

  async updateGlobalSettings(settings: Partial<GlobalSettings>): Promise<ApiResponse<GlobalSettings>> {
    return this.request("/settings/global", {
      method: "PUT",
      body: JSON.stringify(settings),
    }, false);
  }


  // ===========================================================================
  // API Key Endpoints
  // ===========================================================================

  async listApiKeys(orgId: string): Promise<ApiResponse<ApiKeyListItem[]>> {
    return this.request(`/orgs/${orgId}/api-keys`);
  }

  async createApiKey(orgId: string, name: string): Promise<ApiResponse<{ key: string; id: string }>> {
    return this.request(`/orgs/${orgId}/api-keys`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  // ===========================================================================
  // Collection Endpoints
  // ===========================================================================

  async listAllCollections(): Promise<ApiResponse<AllCollectionsResponse>> {
    return this.request("/orgs/collections", {}, false);
  }

  async listOrgCollections(orgId: string, status?: string): Promise<ApiResponse<OrgCollectionsResponse>> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/orgs/${orgId}/collections${query}`);
  }

  async getCollectionSettings(collectionName: string): Promise<ApiResponse<any>> {
    return this.request(`/collections/${encodeURIComponent(collectionName)}/settings`, {}, false);
  }

  async updateCollectionSettings(collectionName: string, settings: any): Promise<ApiResponse<any>> {
    return this.request(`/collections/${encodeURIComponent(collectionName)}/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }, false);
  }

  // ===========================================================================
  // Index/Stats Endpoints
  // ===========================================================================

  async getEventStats(eventId: string): Promise<ApiResponse<EventStats>> {
    return this.request(`/api/v1/index/event/${eventId}/stats`);
  }

  async deleteEvent(eventId: string): Promise<ApiResponse> {
    return this.request(`/api/v1/index/event/${eventId}`, {
      method: "DELETE",
    });
  }

  async getEventImages(eventId: string, status?: string, active?: boolean): Promise<ApiResponse<ImageStatus[]>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (active !== undefined) params.append('active', String(active));
    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request<ApiResponse<ImageStatus[]>>(`/api/v1/index/event/${eventId}/images${query}`);
  }

  async getEventVideos(eventId: string, includeFrames = false, active?: boolean): Promise<ApiResponse<VideoWithFrames[]>> {
    const params = new URLSearchParams();
    if (includeFrames) params.append('includeFrames', 'true');
    if (active !== undefined) params.append('active', String(active));
    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request<ApiResponse<VideoWithFrames[]>>(`/api/v1/index/event/${eventId}/videos${query}`);
  }

  async indexVideo(data: { videoId: string; eventId: string; videoPath?: string; videoUrl?: string; eventSlug?: string }): Promise<ApiResponse> {
    return this.request('/api/v1/index/video', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // =============================================================================
  // Photo Face Details
  // =============================================================================

  async getPhotoFaces(photoId: string, eventId: string, eventSlug?: string): Promise<ApiResponse<PhotoFacesResponse>> {
    const params = new URLSearchParams({ eventId });
    if (eventSlug) params.append('eventSlug', eventSlug);
    return this.request<ApiResponse<PhotoFacesResponse>>(`/api/v1/index/photo/${photoId}/faces?${params.toString()}`);
  }

  async reindexPhoto(photoId: string, eventId: string, options?: { highAccuracy?: boolean; eventSlug?: string }): Promise<ApiResponse> {
    return this.request(`/api/v1/index/photo/${photoId}/reindex`, {
      method: 'POST',
      body: JSON.stringify({
        eventId,
        eventSlug: options?.eventSlug,
        highAccuracy: options?.highAccuracy,
      }),
    });
  }

  // =============================================================================
  // Face Clustering
  // =============================================================================

  async runClustering(eventId: string, eventSlug: string): Promise<ApiResponse<RunClusteringResponse>> {
    return this.request<ApiResponse<RunClusteringResponse>>('/api/v1/clustering/run', {
      method: 'POST',
      body: JSON.stringify({ eventId, eventSlug }),
    });
  }

  async getClusteringJobStatus(jobId: string): Promise<ApiResponse<{ job: ClusteringJob }>> {
    return this.request<ApiResponse<{ job: ClusteringJob }>>(`/api/v1/clustering/job/${jobId}`);
  }

  async getEventClusters(eventId: string, includeNoise = false): Promise<ApiResponse<ClusterListResponse>> {
    const params = new URLSearchParams();
    if (includeNoise) params.append('includeNoise', 'true');
    const query = params.toString();
    return this.request<ApiResponse<ClusterListResponse>>(`/api/v1/clustering/event/${eventId}/clusters${query ? `?${query}` : ''}`);
  }

  async getClusterFaces(clusterId: string, page = 1, limit = 50): Promise<ApiResponse<ClusterFacesResponse>> {
    return this.request<ApiResponse<ClusterFacesResponse>>(`/api/v1/clustering/cluster/${clusterId}/faces?page=${page}&limit=${limit}`);
  }

  async renameCluster(clusterId: string, name: string): Promise<ApiResponse<{ cluster: PersonCluster }>> {
    return this.request<ApiResponse<{ cluster: PersonCluster }>>(`/api/v1/clustering/cluster/${clusterId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  }

  async mergeClusters(clusterIds: string[], targetName?: string): Promise<ApiResponse<{ targetClusterId: string; mergedCount: number }>> {
    return this.request<ApiResponse<{ targetClusterId: string; mergedCount: number }>>('/api/v1/clustering/merge', {
      method: 'POST',
      body: JSON.stringify({ clusterIds, targetName }),
    });
  }

  async moveFace(faceId: string, targetClusterId: string): Promise<ApiResponse<{ faceId: string; sourceClusterId: string; targetClusterId: string }>> {
    return this.request<ApiResponse<{ faceId: string; sourceClusterId: string; targetClusterId: string }>>('/api/v1/clustering/move-face', {
      method: 'POST',
      body: JSON.stringify({ faceId, targetClusterId }),
    });
  }

  async splitCluster(
    faceIds: string[],
    eventId: string,
    eventSlug: string,
    newClusterName?: string
  ): Promise<ApiResponse<{ newClusterId: string; newClusterName: string; faceCount: number }>> {
    return this.request<ApiResponse<{ newClusterId: string; newClusterName: string; faceCount: number }>>('/api/v1/clustering/split', {
      method: 'POST',
      body: JSON.stringify({ faceIds, eventId, eventSlug, newClusterName }),
    });
  }

  // Thumbnail URLs (not API calls, just URL builders)
  // Include auth token as query param since img src can't use headers
  getFaceThumbnailUrl(faceId: string, size = 150, format = 'jpeg'): string {
    const authToken = this.getAuthToken();
    const tokenParam = authToken ? `&token=${encodeURIComponent(authToken)}` : '';
    return `${API_BASE_URL}/api/v1/clustering/face/${faceId}/thumbnail?size=${size}&format=${format}${tokenParam}`;
  }

  getClusterThumbnailUrl(clusterId: string, size = 150, format = 'jpeg'): string {
    const authToken = this.getAuthToken();
    const tokenParam = authToken ? `&token=${encodeURIComponent(authToken)}` : '';
    return `${API_BASE_URL}/api/v1/clustering/cluster/${clusterId}/thumbnail?size=${size}&format=${format}${tokenParam}`;
  }
}

export const api = new ApiClient();

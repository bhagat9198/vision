import type {
  ApiResponse,
  HealthCheckResponse,
  Organization,
  OrganizationListItem,
  CreateOrgRequest,
  CreateOrgResponse,
  ApiKeyListItem,
  EventStats,
  OrgCollectionsResponse,
  AllCollectionsResponse,
  VideoWithFrames,
  PhotoFacesResponse,
} from "./types";

// =============================================================================
// API Configuration
// =============================================================================

import Cookies from 'js-cookie';

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
}

export const api = new ApiClient();

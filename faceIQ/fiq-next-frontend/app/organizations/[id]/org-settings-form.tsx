"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Save, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { Organization, FaceDetectionMode, ImageSourceMode, FaceRecognitionProvider, ClusteringProvider, GlobalSettings } from "@/lib/types";

interface OrgSettingsFormProps {
  org: Organization;
  onUpdate: () => void;
}

export function OrgSettingsForm({ org, onUpdate }: OrgSettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [globalDefaults, setGlobalDefaults] = useState<GlobalSettings | null>(null);
  const [showRecognitionKey, setShowRecognitionKey] = useState(false);
  const [showDetectionKey, setShowDetectionKey] = useState(false);
  const [settings, setSettings] = useState({
    comprefaceUrl: org.comprefaceUrl || "",
    comprefaceRecognitionApiKey: org.comprefaceRecognitionApiKey || "",
    comprefaceDetectionApiKey: org.comprefaceDetectionApiKey || "",
    faceDetectionMode: org.faceDetectionMode,
    imageSourceMode: org.imageSourceMode || "URL",
    sharedStoragePath: org.sharedStoragePath || "",
    minConfidence: org.minConfidence,
    minSizePx: org.minSizePx,
    skipExtremeAngles: org.skipExtremeAngles,
    searchDefaultTopK: org.searchDefaultTopK,
    searchMinSimilarity: org.searchMinSimilarity,
    embeddingCacheTtlSeconds: org.embeddingCacheTtlSeconds,
    pythonSidecarUrl: org.pythonSidecarUrl || "",
    enableFallbackDetection: org.enableFallbackDetection,
    enableAlignment: org.enableAlignment,
    // Face Recognition Provider
    faceRecognitionProvider: org.faceRecognitionProvider || "COMPREFACE",
    insightfaceModel: org.insightfaceModel || "buffalo_l",
    // Clustering Settings
    clusteringProvider: org.clusteringProvider || "QDRANT",
    clusteringMinClusterSize: org.clusteringMinClusterSize ?? 2,
    clusteringMinSamples: org.clusteringMinSamples ?? 2,
    clusteringSimilarityThreshold: org.clusteringSimilarityThreshold ?? 0.6,
  });


  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (settings.comprefaceUrl) updateData.comprefaceUrl = settings.comprefaceUrl;
      if (settings.comprefaceRecognitionApiKey) updateData.comprefaceRecognitionApiKey = settings.comprefaceRecognitionApiKey;
      if (settings.comprefaceDetectionApiKey) updateData.comprefaceDetectionApiKey = settings.comprefaceDetectionApiKey;
      if (settings.sharedStoragePath) updateData.sharedStoragePath = settings.sharedStoragePath;
      if (settings.pythonSidecarUrl) updateData.pythonSidecarUrl = settings.pythonSidecarUrl;
      updateData.faceDetectionMode = settings.faceDetectionMode;
      updateData.imageSourceMode = settings.imageSourceMode;
      updateData.skipExtremeAngles = settings.skipExtremeAngles;
      updateData.minConfidence = settings.minConfidence;
      updateData.minSizePx = settings.minSizePx;
      updateData.skipExtremeAngles = settings.skipExtremeAngles;
      updateData.searchDefaultTopK = settings.searchDefaultTopK;
      updateData.searchMinSimilarity = settings.searchMinSimilarity;
      updateData.embeddingCacheTtlSeconds = settings.embeddingCacheTtlSeconds;
      updateData.enableFallbackDetection = settings.enableFallbackDetection;
      updateData.enableAlignment = settings.enableAlignment;
      updateData.faceRecognitionProvider = settings.faceRecognitionProvider;
      if (settings.insightfaceModel) updateData.insightfaceModel = settings.insightfaceModel;
      // Clustering settings
      updateData.clusteringProvider = settings.clusteringProvider;
      updateData.clusteringMinClusterSize = settings.clusteringMinClusterSize;
      updateData.clusteringMinSamples = settings.clusteringMinSamples;
      updateData.clusteringSimilarityThreshold = settings.clusteringSimilarityThreshold;

      const response = await api.updateOrgSettings(org.id, updateData as Partial<Organization>);
      if (response.success) {
        toast.success("Settings saved successfully");
        onUpdate();
      } else {
        toast.error(response.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Organization Settings
        </CardTitle>
        <CardDescription>Configure face detection and search settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Face Recognition Provider */}
        <div className="space-y-4">
          <h3 className="font-medium">Face Recognition Provider</h3>
          <p className="text-sm text-muted-foreground">
            Choose between CompreFace (external service) or InsightFace (built-in Python sidecar)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="faceRecognitionProvider">Provider</Label>
              <select
                id="faceRecognitionProvider"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.faceRecognitionProvider}
                onChange={(e) => setSettings({ ...settings, faceRecognitionProvider: e.target.value as FaceRecognitionProvider })}
              >
                <option value="COMPREFACE">CompreFace (External)</option>
                <option value="INSIGHTFACE">InsightFace (Built-in)</option>
              </select>
            </div>
            {settings.faceRecognitionProvider === "INSIGHTFACE" && (
              <div className="grid gap-2">
                <Label htmlFor="insightfaceModel">InsightFace Model</Label>
                <select
                  id="insightfaceModel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settings.insightfaceModel}
                  onChange={(e) => setSettings({ ...settings, insightfaceModel: e.target.value })}
                >
                  <option value="buffalo_l">buffalo_l (Best Quality, ~326MB)</option>
                  <option value="buffalo_m">buffalo_m (Medium, ~200MB)</option>
                  <option value="buffalo_s">buffalo_s (Small, ~100MB)</option>
                  <option value="antelopev2">antelopev2 (Alternative)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* CompreFace Settings - Only show when CompreFace is selected */}
        {settings.faceRecognitionProvider === "COMPREFACE" && (
          <div className="space-y-4">
            <h3 className="font-medium">CompreFace Configuration</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="comprefaceUrl">CompreFace URL</Label>
                <Input id="comprefaceUrl" placeholder="http://localhost:8000" value={settings.comprefaceUrl} onChange={(e) => setSettings({ ...settings, comprefaceUrl: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recognitionKey">Recognition API Key</Label>
                <div className="relative">
                  <Input
                    id="recognitionKey"
                    type={showRecognitionKey ? "text" : "password"}
                    placeholder="Leave blank to keep current"
                    value={settings.comprefaceRecognitionApiKey}
                    onChange={(e) => setSettings({ ...settings, comprefaceRecognitionApiKey: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecognitionKey(!showRecognitionKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showRecognitionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="detectionKey">Detection API Key</Label>
                <div className="relative">
                  <Input
                    id="detectionKey"
                    type={showDetectionKey ? "text" : "password"}
                    placeholder="Leave blank to keep current"
                    value={settings.comprefaceDetectionApiKey}
                    onChange={(e) => setSettings({ ...settings, comprefaceDetectionApiKey: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDetectionKey(!showDetectionKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showDetectionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Python Sidecar Settings - Only show when InsightFace is selected */}
        {settings.faceRecognitionProvider === "INSIGHTFACE" && (
          <div className="space-y-4">
            <h3 className="font-medium">Python Sidecar Configuration</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pythonSidecarUrl">Python Sidecar URL</Label>
                <Input id="pythonSidecarUrl" placeholder="http://localhost:4002" value={settings.pythonSidecarUrl} onChange={(e) => setSettings({ ...settings, pythonSidecarUrl: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Image Source Configuration */}
        <div className="space-y-4">
          <h3 className="font-medium">Image Source Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure how images are provided to the face detection service
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="imageSourceMode">Image Source Mode</Label>
              <select
                id="imageSourceMode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.imageSourceMode}
                onChange={(e) => setSettings({ ...settings, imageSourceMode: e.target.value as ImageSourceMode })}
              >
                <option value="URL">URL (HTTP/HTTPS)</option>
                <option value="MULTIPART">Multipart Upload</option>
                <option value="SHARED_STORAGE">Shared Storage (File System)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                How images are provided to the backend
              </p>
            </div>
            {settings.imageSourceMode === 'SHARED_STORAGE' && (
              <div className="grid gap-2">
                <Label htmlFor="sharedStoragePath">Shared Storage Path</Label>
                <Input
                  id="sharedStoragePath"
                  placeholder="/path/to/shared/storage"
                  value={settings.sharedStoragePath}
                  onChange={(e) => setSettings({ ...settings, sharedStoragePath: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Absolute path to shared storage directory
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Detection Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Detection Settings</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="faceDetectionMode">Detection Mode</Label>
              <select id="faceDetectionMode" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={settings.faceDetectionMode} onChange={(e) => setSettings({ ...settings, faceDetectionMode: e.target.value as FaceDetectionMode })}>
                <option value="RECOGNITION_ONLY">Recognition Only</option>
                <option value="DETECTION_THEN_RECOGNITION">Detection then Recognition</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minConfidence">
                Min Confidence
                {!org.minConfidence && globalDefaults && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Using global default
                  </Badge>
                )}
              </Label>
              <Input
                id="minConfidence"
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder={globalDefaults?.minConfidence?.toString() || "0.7"}
                value={settings.minConfidence}
                onChange={(e) => setSettings({ ...settings, minConfidence: parseFloat(e.target.value) })}
              />
              {!org.minConfidence && globalDefaults && (
                <p className="text-xs text-muted-foreground">
                  Current: {globalDefaults.minConfidence} (global default)
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minSizePx">Min Face Size (px)</Label>
              <Input id="minSizePx" type="number" min="0" value={settings.minSizePx} onChange={(e) => setSettings({ ...settings, minSizePx: parseInt(e.target.value) })} />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Advanced Options</Label>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="skipExtremeAngles">Skip Extreme Angles</Label>
                <p className="text-xs text-muted-foreground">
                  Filter out faces with extreme head poses
                </p>
              </div>
              <Switch
                id="skipExtremeAngles"
                checked={settings.skipExtremeAngles}
                onCheckedChange={(checked: boolean) => setSettings({ ...settings, skipExtremeAngles: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableFallbackDetection">Enable Fallback Detection</Label>
                <p className="text-xs text-muted-foreground">
                  Use Python sidecar as fallback if primary detector fails
                </p>
              </div>
              <Switch
                id="enableFallbackDetection"
                checked={settings.enableFallbackDetection}
                onCheckedChange={(checked: boolean) => setSettings({ ...settings, enableFallbackDetection: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableAlignment">Enable Face Alignment</Label>
                <p className="text-xs text-muted-foreground">
                  Align faces before embedding extraction for better accuracy
                </p>
              </div>
              <Switch
                id="enableAlignment"
                checked={settings.enableAlignment}
                onCheckedChange={(checked: boolean) => setSettings({ ...settings, enableAlignment: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Search Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Search Settings</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="topK">Default Top K</Label>
              <Input id="topK" type="number" min="1" value={settings.searchDefaultTopK} onChange={(e) => setSettings({ ...settings, searchDefaultTopK: parseInt(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minSimilarity">Min Similarity</Label>
              <Input id="minSimilarity" type="number" step="0.01" min="0" max="1" value={settings.searchMinSimilarity} onChange={(e) => setSettings({ ...settings, searchMinSimilarity: parseFloat(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cacheTtl">Cache TTL (seconds)</Label>
              <Input id="cacheTtl" type="number" min="0" value={settings.embeddingCacheTtlSeconds} onChange={(e) => setSettings({ ...settings, embeddingCacheTtlSeconds: parseInt(e.target.value) })} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Clustering Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Face Clustering Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure how faces are grouped into person clusters
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="clusteringProvider">Clustering Provider</Label>
              <select
                id="clusteringProvider"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.clusteringProvider}
                onChange={(e) => setSettings({ ...settings, clusteringProvider: e.target.value as ClusteringProvider })}
              >
                <option value="QDRANT">QDRANT (Built-in, Fast)</option>
                <option value="HDBSCAN">HDBSCAN (Python Sidecar, Better Quality)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="similarityThreshold">Similarity Threshold</Label>
              <Input
                id="similarityThreshold"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.clusteringSimilarityThreshold}
                onChange={(e) => setSettings({ ...settings, clusteringSimilarityThreshold: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Higher = stricter (0.6-0.8 typical)</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minClusterSize">Min Cluster Size</Label>
              <Input
                id="minClusterSize"
                type="number"
                min="2"
                value={settings.clusteringMinClusterSize}
                onChange={(e) => setSettings({ ...settings, clusteringMinClusterSize: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Min faces to form a cluster</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minSamples">Min Samples</Label>
              <Input
                id="minSamples"
                type="number"
                min="1"
                value={settings.clusteringMinSamples}
                onChange={(e) => setSettings({ ...settings, clusteringMinSamples: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">HDBSCAN parameter</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { Organization, FaceDetectionMode, ImageSourceMode, FaceRecognitionProvider } from "@/lib/types";

interface OrgSettingsFormProps {
  org: Organization;
  onUpdate: () => void;
}

export function OrgSettingsForm({ org, onUpdate }: OrgSettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    comprefaceUrl: org.comprefaceUrl || "",
    comprefaceRecognitionApiKey: "",
    comprefaceDetectionApiKey: "",
    faceDetectionMode: org.faceDetectionMode,
    imageSourceMode: org.imageSourceMode,
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
                <Input id="recognitionKey" type="password" placeholder="Leave blank to keep current" value={settings.comprefaceRecognitionApiKey} onChange={(e) => setSettings({ ...settings, comprefaceRecognitionApiKey: e.target.value })} />
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
              <Label htmlFor="minConfidence">Min Confidence</Label>
              <Input id="minConfidence" type="number" step="0.01" min="0" max="1" value={settings.minConfidence} onChange={(e) => setSettings({ ...settings, minConfidence: parseFloat(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minSizePx">Min Face Size (px)</Label>
              <Input id="minSizePx" type="number" min="0" value={settings.minSizePx} onChange={(e) => setSettings({ ...settings, minSizePx: parseInt(e.target.value) })} />
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


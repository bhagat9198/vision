"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { GlobalSettings } from "@/lib/types";

export function GlobalSettingsForm() {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await api.getGlobalSettings();
            if (response.success && response.data) {
                setSettings(response.data);
            } else {
                toast.error("Failed to load global settings");
            }
        } catch (error) {
            console.error("Error loading global settings:", error);
            toast.error("Failed to load global settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            const response = await api.updateGlobalSettings(settings);
            if (response.success && response.data) {
                setSettings(response.data);
                toast.success("Global settings updated successfully");
            } else {
                toast.error(response.error || "Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating global settings:", error);
            toast.error("Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (!settings) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    Failed to load settings
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Default Organization Settings
                </CardTitle>
                <CardDescription>
                    These settings serve as defaults for all organizations. Organizations inherit these values unless they define their own.
                    <Badge variant="default" className="ml-2">Editable</Badge>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        💡 <strong>Note:</strong> Changes to global defaults will apply to new organizations and existing organizations that haven't overridden these values.
                    </p>
                </div>

                {/* Face Recognition Provider */}
                <div className="space-y-4">
                    <h3 className="font-medium">Face Recognition Provider</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="faceRecognitionProvider">Provider</Label>
                            <select
                                id="faceRecognitionProvider"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={settings.faceRecognitionProvider}
                                onChange={(e) => setSettings({ ...settings, faceRecognitionProvider: e.target.value as any })}
                            >
                                <option value="COMPREFACE">CompreFace</option>
                                <option value="INSIGHTFACE">InsightFace</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="insightfaceModel">InsightFace Model</Label>
                            <Input
                                id="insightfaceModel"
                                value={settings.insightfaceModel || ""}
                                onChange={(e) => setSettings({ ...settings, insightfaceModel: e.target.value })}
                                placeholder="buffalo_l"
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* CompreFace Configuration */}
                <div className="space-y-4">
                    <h3 className="font-medium">CompreFace Configuration</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="comprefaceUrl">CompreFace URL</Label>
                            <Input
                                id="comprefaceUrl"
                                value={settings.comprefaceUrl || ""}
                                onChange={(e) => setSettings({ ...settings, comprefaceUrl: e.target.value })}
                                placeholder="http://localhost:8000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pythonSidecarUrl">Python Sidecar URL</Label>
                            <Input
                                id="pythonSidecarUrl"
                                value={settings.pythonSidecarUrl || ""}
                                onChange={(e) => setSettings({ ...settings, pythonSidecarUrl: e.target.value })}
                                placeholder="http://localhost:4002"
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Image Source Configuration */}
                <div className="space-y-4">
                    <h3 className="font-medium">Image Source Configuration</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="imageSourceMode">Image Source Mode</Label>
                            <select
                                id="imageSourceMode"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={settings.imageSourceMode}
                                onChange={(e) => setSettings({ ...settings, imageSourceMode: e.target.value as any })}
                            >
                                <option value="URL">URL</option>
                                <option value="MULTIPART">Multipart</option>
                                <option value="SHARED_STORAGE">Shared Storage</option>
                            </select>
                        </div>
                        {settings.imageSourceMode === "SHARED_STORAGE" && (
                            <div className="grid gap-2">
                                <Label htmlFor="sharedStoragePath">Shared Storage Path</Label>
                                <Input
                                    id="sharedStoragePath"
                                    value={settings.sharedStoragePath || ""}
                                    onChange={(e) => setSettings({ ...settings, sharedStoragePath: e.target.value })}
                                    placeholder="/path/to/shared/storage"
                                />
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
                            <select
                                id="faceDetectionMode"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={settings.faceDetectionMode}
                                onChange={(e) => setSettings({ ...settings, faceDetectionMode: e.target.value as any })}
                            >
                                <option value="RECOGNITION_ONLY">Recognition Only</option>
                                <option value="DETECTION_THEN_RECOGNITION">Detection Then Recognition</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="minConfidence">Min Confidence</Label>
                            <Input
                                id="minConfidence"
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={settings.minConfidence}
                                onChange={(e) => setSettings({ ...settings, minConfidence: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="minSizePx">Min Face Size (px)</Label>
                            <Input
                                id="minSizePx"
                                type="number"
                                value={settings.minSizePx}
                                onChange={(e) => setSettings({ ...settings, minSizePx: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Advanced Options</Label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <Label htmlFor="skipExtremeAngles" className="cursor-pointer">Skip Extreme Angles</Label>
                                <Switch
                                    id="skipExtremeAngles"
                                    checked={settings.skipExtremeAngles}
                                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, skipExtremeAngles: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <Label htmlFor="enableFallbackDetection" className="cursor-pointer">Enable Fallback Detection</Label>
                                <Switch
                                    id="enableFallbackDetection"
                                    checked={settings.enableFallbackDetection}
                                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, enableFallbackDetection: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <Label htmlFor="enableAlignment" className="cursor-pointer">Enable Face Alignment</Label>
                                <Switch
                                    id="enableAlignment"
                                    checked={settings.enableAlignment}
                                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, enableAlignment: checked })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Search Settings */}
                <div className="space-y-4">
                    <h3 className="font-medium">Search Settings</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="searchDefaultTopK">Default Top K</Label>
                            <Input
                                id="searchDefaultTopK"
                                type="number"
                                value={settings.searchDefaultTopK}
                                onChange={(e) => setSettings({ ...settings, searchDefaultTopK: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="searchMinSimilarity">Min Similarity</Label>
                            <Input
                                id="searchMinSimilarity"
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={settings.searchMinSimilarity}
                                onChange={(e) => setSettings({ ...settings, searchMinSimilarity: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="embeddingCacheTtlSeconds">Cache TTL (seconds)</Label>
                            <Input
                                id="embeddingCacheTtlSeconds"
                                type="number"
                                value={settings.embeddingCacheTtlSeconds}
                                onChange={(e) => setSettings({ ...settings, embeddingCacheTtlSeconds: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Clustering Settings */}
                <div className="space-y-4">
                    <h3 className="font-medium">Face Clustering Settings</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="grid gap-2">
                            <Label htmlFor="clusteringProvider">Clustering Provider</Label>
                            <select
                                id="clusteringProvider"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={settings.clusteringProvider}
                                onChange={(e) => setSettings({ ...settings, clusteringProvider: e.target.value as any })}
                            >
                                <option value="QDRANT">Qdrant</option>
                                <option value="HDBSCAN">HDBSCAN</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="clusteringSimilarityThreshold">Similarity Threshold</Label>
                            <Input
                                id="clusteringSimilarityThreshold"
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={settings.clusteringSimilarityThreshold}
                                onChange={(e) => setSettings({ ...settings, clusteringSimilarityThreshold: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="clusteringMinClusterSize">Min Cluster Size</Label>
                            <Input
                                id="clusteringMinClusterSize"
                                type="number"
                                value={settings.clusteringMinClusterSize}
                                onChange={(e) => setSettings({ ...settings, clusteringMinClusterSize: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="clusteringMinSamples">Min Samples</Label>
                            <Input
                                id="clusteringMinSamples"
                                type="number"
                                value={settings.clusteringMinSamples}
                                onChange={(e) => setSettings({ ...settings, clusteringMinSamples: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Global Settings
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function CollectionSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const collectionName = decodeURIComponent(params.collectionName as string);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        autoClustering: false,
        autoIndexing: true,
        notifyOnCompletion: false,
    });

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.getCollectionSettings(collectionName);
                if (response.success && response.data) {
                    setSettings({
                        autoClustering: response.data.autoClustering ?? false,
                        autoIndexing: response.data.autoIndexing ?? true,
                        notifyOnCompletion: response.data.notifyOnCompletion ?? false,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [collectionName]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await api.updateCollectionSettings(collectionName, settings);

            if (response.success) {
                toast.success("Settings saved successfully");
            } else {
                toast.error(response.error || "Failed to save settings");
            }
        } catch (error) {
            toast.error("Failed to save settings");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <Link href="/collections" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Collections
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Collection Settings</h1>
                        <p className="text-muted-foreground font-mono text-sm">
                            {collectionName}
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>

                {/* Settings Cards */}
                <div className="space-y-4">
                    {/* Auto Clustering */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Auto Clustering</CardTitle>
                            <CardDescription>
                                Automatically cluster faces when new images or videos are added to this collection
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="auto-clustering">Enable Auto Clustering</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Faces will be automatically grouped into clusters based on similarity
                                    </p>
                                </div>
                                <Switch
                                    id="auto-clustering"
                                    checked={settings.autoClustering}
                                    onCheckedChange={(checked) => setSettings({ ...settings, autoClustering: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Auto Indexing */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Auto Indexing</CardTitle>
                            <CardDescription>
                                Automatically index new faces as they are detected
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="auto-indexing">Enable Auto Indexing</Label>
                                    <p className="text-sm text-muted-foreground">
                                        New faces will be immediately added to the vector database
                                    </p>
                                </div>
                                <Switch
                                    id="auto-indexing"
                                    checked={settings.autoIndexing}
                                    onCheckedChange={(checked) => setSettings({ ...settings, autoIndexing: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>
                                Configure notification preferences for this collection
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="notify-completion">Notify on Completion</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive notifications when indexing or clustering completes
                                    </p>
                                </div>
                                <Switch
                                    id="notify-completion"
                                    checked={settings.notifyOnCompletion}
                                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnCompletion: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Key, Save, Eye, EyeOff, Copy, Check } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryTabs } from "@/lib/hooks/use-query-tabs";
import { api } from "@/lib/api";
import { GlobalSettingsForm } from "./global-settings-form";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useQueryTabs("api-keys", "tab");
  const [masterKey, setMasterKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState<"master" | "api" | null>(null);

  useEffect(() => {
    // Load saved keys
    setMasterKey(api.getMasterKey() || "");
    setApiKey(api.getApiKey() || "");
  }, []);

  const handleSave = () => {
    if (masterKey.trim()) {
      api.setMasterKey(masterKey.trim());
    }
    if (apiKey.trim()) {
      api.setApiKey(apiKey.trim());
    }
    toast.success("Settings saved", {
      description: "API keys have been stored locally",
    });
  };

  const handleClear = () => {
    api.clearKeys();
    setMasterKey("");
    setApiKey("");
    toast.success("Keys cleared", {
      description: "All API keys have been removed",
    });
  };

  const copyToClipboard = async (key: string, type: "master" | "api") => {
    await navigator.clipboard.writeText(key);
    setCopied(type);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure API keys and default organization settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="api-keys">
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="defaults">
              <Settings className="mr-2 h-4 w-4" />
              Organization Defaults
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Authentication
                </CardTitle>
                <CardDescription>
                  Configure API keys for accessing the img-analyse-backend. Keys are stored locally in your browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Master Key */}
                <div className="space-y-2">
                  <Label htmlFor="masterKey">Master API Key</Label>
                  <p className="text-xs text-muted-foreground">
                    Required for admin operations (listing orgs, creating orgs, viewing all collections)
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="masterKey"
                        type={showMasterKey ? "text" : "password"}
                        placeholder="Enter master API key"
                        value={masterKey}
                        onChange={(e) => setMasterKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-8 top-1/2 -translate-y-1/2"
                        onClick={() => setShowMasterKey(!showMasterKey)}
                      >
                        {showMasterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {masterKey && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => copyToClipboard(masterKey, "master")}
                        >
                          {copied === "master" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Org API Key */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Organization API Key</Label>
                  <p className="text-xs text-muted-foreground">
                    Required for org-specific operations (indexing, searching, viewing org details)
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="apiKey"
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter organization API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-8 top-1/2 -translate-y-1/2"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {apiKey && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => copyToClipboard(apiKey, "api")}
                        >
                          {copied === "api" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleClear}>
                    Clear All Keys
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  API Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">API Base URL</Label>
                    <p className="font-mono text-sm">{process.env.NEXT_PUBLIC_IMG_ANALYSE_API_URL || "http://localhost:3002"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Master Key Header</Label>
                    <p className="font-mono text-sm">x-master-key</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Org Key Header</Label>
                    <p className="font-mono text-sm">x-api-key</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defaults">
            <GlobalSettingsForm />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}


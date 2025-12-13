"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw, Key, Settings, Database, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Organization, ApiKeyListItem, CollectionInfo } from "@/lib/types";
import { OrgSettingsForm } from "./org-settings-form";
import { ApiKeysTable } from "./api-keys-table";
import { OrgCollections } from "./org-collections";

export default function OrganizationDetailPage() {
  const params = useParams();
  const orgId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");

  const fetcher = useCallback(async () => {
    const response = await api.getOrganization(orgId);
    return response.data;
  }, [orgId]);

  const { data: org, loading, error, refetch } = useApi<Organization | undefined>(fetcher);

  if (loading) {
    return (
      <AppLayout>
        <OrgDetailSkeleton />
      </AppLayout>
    );
  }

  if (error || !org) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Link href="/organizations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Organizations
          </Link>
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                {error?.message || "Organization not found"}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link href="/organizations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Organizations
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
              <Badge variant={org.isActive ? "success" : "secondary"}>
                {org.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {formatDate(org.createdAt)}
            </p>
          </div>
          <Button variant="outline" size="icon-sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <Database className="mr-2 h-4 w-4" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OrgCollections orgId={orgId} />
          </TabsContent>

          <TabsContent value="api-keys" className="mt-6">
            <ApiKeysTable orgId={orgId} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <OrgSettingsForm org={org} onUpdate={refetch} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function OrgDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}


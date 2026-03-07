"use client";

import { useCallback } from "react";
import { Building2, Layers, Database, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { OrganizationListItem, AllCollectionsResponse } from "@/lib/types";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const orgsFetcher = useCallback(async () => {
    const response = await api.listOrganizations();
    return response.data || [];
  }, []);

  const collectionsFetcher = useCallback(async () => {
    const response = await api.listAllCollections();
    return response.data;
  }, []);

  const { data: orgs, loading: orgsLoading } = useApi<OrganizationListItem[]>(orgsFetcher);
  const { data: collections, loading: collectionsLoading } = useApi<AllCollectionsResponse | undefined>(collectionsFetcher);

  const loading = orgsLoading || collectionsLoading;

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalOrgs = orgs?.length || 0;
  const activeOrgs = orgs?.filter((o) => o.isActive).length || 0;
  const totalCollections = collections?.totalCollections || 0;
  const totalVectors = collections?.totalVectors || 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Organizations"
        value={formatNumber(totalOrgs)}
        description="Registered organizations"
        icon={Building2}
      />
      <StatCard
        title="Active Organizations"
        value={formatNumber(activeOrgs)}
        description={`${totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0}% of total`}
        icon={Users}
      />
      <StatCard
        title="Collections"
        value={formatNumber(totalCollections)}
        description="Qdrant event collections"
        icon={Database}
      />
      <StatCard
        title="Face Embeddings"
        value={formatNumber(totalVectors)}
        description="Total vectors indexed"
        icon={Layers}
      />
    </div>
  );
}


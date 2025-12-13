"use client";

import { useCallback } from "react";
import { RefreshCw, Database, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { usePollingApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { AllCollectionsResponse } from "@/lib/types";

export function CollectionInsights() {
  const fetcher = useCallback(async () => {
    const response = await api.listAllCollections();
    return response.data;
  }, []);

  const { data, loading, error, refetch } = usePollingApi<AllCollectionsResponse | undefined>(
    fetcher,
    60000 // Refresh every minute
  );

  if (loading && !data) {
    return <InsightsSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Collection Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to fetch collection data. Check your master key in Settings.</p>
        </CardContent>
      </Card>
    );
  }

  const collections = data?.collections || [];

  // Logic driven by User Request:
  // - In Progress: Has active jobs in DB (isIndexing/pendingCount > 0) OR Qdrant optimizer is busy (status != green).
  // - Fully Indexed: No active jobs AND Qdrant is idle (green) AND has vectors.
  // - Empty: No vectors.
  const indexingInProgress = collections.filter((c) => c.isIndexing || c.status !== 'green');

  const fullyIndexed = collections.filter((c) => {
    if (c.vectorCount === 0) return false;
    return !c.isIndexing && c.status === 'green';
  });

  const emptyCollections = collections.filter((c) => c.vectorCount === 0 && !c.isIndexing);

  // Group by org and get top 5 by vector count
  const collectionsByOrg = collections.reduce((acc, c) => {
    if (!acc[c.orgId]) acc[c.orgId] = { orgId: c.orgId, count: 0, vectors: 0 };
    acc[c.orgId].count++;
    acc[c.orgId].vectors += c.vectorCount;
    return acc;
  }, {} as Record<string, { orgId: string; count: number; vectors: number }>);

  const topOrgs = Object.values(collectionsByOrg)
    .sort((a, b) => b.vectors - a.vectors)
    .slice(0, 5);

  const overallProgress = data?.totalVectors
    ? Math.round((data.totalIndexed / data.totalVectors) * 100)
    : 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Collection Insights
            </CardTitle>
            <CardDescription>Real-time Qdrant collection analytics</CardDescription>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Indexing Status */}
          <div className="space-y-4">
            <h4 className="font-medium">Indexing Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className="text-sm font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <Link href="/collections?status=indexed" className="block">
                  <div className="rounded-lg bg-success/10 p-2 hover:bg-success/20 transition-colors cursor-pointer">
                    <div className="text-lg font-bold text-success">{fullyIndexed.length}</div>
                    <div className="text-xs text-muted-foreground">Fully Indexed</div>
                  </div>
                </Link>
                <Link href="/collections?status=progress" className="block">
                  <div className="rounded-lg bg-warning/10 p-2 hover:bg-warning/20 transition-colors cursor-pointer">
                    <div className="text-lg font-bold text-warning">{indexingInProgress.length}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                </Link>
                <Link href="/collections?status=empty" className="block">
                  <div className="rounded-lg bg-muted p-2 hover:bg-muted/80 transition-colors cursor-pointer">
                    <div className="text-lg font-bold">{emptyCollections.length}</div>
                    <div className="text-xs text-muted-foreground">Empty</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Top Collections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Recent Collections</h4>
              <Link href="/collections">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            {collections.length > 0 ? (
              <div className="space-y-2">
                {collections.slice(0, 5).map((collection, index) => {
                  // Try to extract eventId from name: org_{orgId}_event_{eventId}_faces
                  const match = collection.collectionName.match(/event_([^_]+)_faces/);
                  const eventId = match ? match[1] : collection.collectionName;
                  const isParsingSuccess = !!match;

                  return (
                    <div key={collection.collectionName} className="flex items-center justify-between rounded-lg border p-2">
                      <div className="grid gap-1 min-w-0">
                        {isParsingSuccess ? (
                          <Link href={`/dashboard/events/${eventId}`} className="font-mono text-xs font-medium hover:underline text-primary truncate" title={eventId}>
                            {eventId}
                          </Link>
                        ) : (
                          <div className="font-mono text-xs font-medium truncate" title={collection.collectionName}>
                            {collection.collectionName}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatNumber(collection.vectorCount)} vectors</span>
                          {(collection.status !== 'green' || collection.isIndexing) && (
                            <span className="text-warning flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {collection.isIndexing ? `Indexing (${collection.pendingCount})` : 'Optimizing'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-2">
                        <Badge variant={collection.status === 'green' ? 'success' : 'secondary'} className="text-[10px] h-5 px-1.5">
                          {collection.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                <Database className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2 text-sm">No collections yet</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </CardContent>
    </Card>
  );
}


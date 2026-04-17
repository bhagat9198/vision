"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { RefreshCw, Database, Layers, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { OrgCollectionsResponse } from "@/lib/types";

interface OrgCollectionsProps {
  orgId: string;
}

export function OrgCollections({ orgId }: OrgCollectionsProps) {
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const fetcher = useCallback(async () => {
    const response = await api.listOrgCollections(orgId, status);
    return response.data;
  }, [orgId, status]);

  const { data, loading, error, refetch } = useApi<OrgCollectionsResponse | undefined>(
    fetcher
  );

  if (loading && !data) {
    return <CollectionsSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.totalCollections || 0)}</div>
            <p className="text-xs text-muted-foreground">Qdrant event collections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vectors</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.totalVectors || 0)}</div>
            <p className="text-xs text-muted-foreground">Face embeddings stored</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indexed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.totalIndexed || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {data?.totalVectors ? `${Math.round((data.totalIndexed / data.totalVectors) * 100)}% indexed` : "Ready for search"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Event Collections
              </CardTitle>
              <CardDescription>
                Collection naming: org_{"{slug}"}_event_{"{slug}"}_faces
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={status === 'active' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatus('active')}
                  className="h-7 text-xs"
                >
                  Active
                </Button>
                <Button
                  variant={status === 'inactive' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatus('inactive')}
                  className="h-7 text-xs"
                >
                  Inactive
                </Button>
              </div>
              <Button variant="outline" size="icon-sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data?.collections && data.collections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Vectors</TableHead>
                  <TableHead className="text-right">Indexed</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.collections.map((collection) => {
                  const progress = collection.vectorCount > 0
                    ? Math.round((collection.indexedVectorCount / collection.vectorCount) * 100)
                    : 100;
                  return (
                    <TableRow key={collection.collectionName}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/dashboard/events/${collection.eventId || collection.eventSlug}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {collection.eventSlug || collection.eventId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={collection.status === "green" ? "success" : "warning"}>
                          {collection.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(collection.vectorCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(collection.indexedVectorCount)}</TableCell>
                      <TableCell className="w-32">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2" />
                          <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Database className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No collections yet</p>
              <p className="text-sm">Collections are created when photos are indexed</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}


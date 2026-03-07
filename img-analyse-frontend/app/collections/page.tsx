"use client";

import { useCallback, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Database, Layers, Building2, Search, CheckCircle, Settings } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { AllCollectionsResponse } from "@/lib/types";

function CollectionsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status"); // 'indexed', 'progress', 'empty'

  const fetcher = useCallback(async () => {
    const response = await api.listAllCollections();
    return response.data;
  }, []);

  const { data, loading, error, refetch } = useApi<AllCollectionsResponse | undefined>(
    fetcher
  );

  const filteredCollections = data?.collections?.filter((c) => {
    // 1. Text Search
    const matchesSearch = c.collectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.eventId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.orgId.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Status Filter (from URL)
    if (statusFilter) {
      if (statusFilter === 'deleted' && c.status === 'deleted') return true;
      if (statusFilter === 'deleted') return false; // If looking for deleted, skip others

      const isIndexing = c.isIndexing || c.status !== 'green';
      const isFull = !isIndexing && c.status === 'green' && c.vectorCount > 0;
      const isEmpty = c.vectorCount === 0 && !c.isIndexing;

      if (statusFilter === 'progress' && !isIndexing) return false;
      if (statusFilter === 'indexed' && !isFull) return false;
      if (statusFilter === 'empty' && !isEmpty) return false;
    }
    return true;
  });

  // Group collections by org
  const collectionsByOrg = filteredCollections?.reduce((acc, c) => {
    if (!acc[c.orgId]) acc[c.orgId] = [];
    acc[c.orgId].push(c);
    return acc;
  }, {} as Record<string, typeof filteredCollections>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Monitor Qdrant vector collections across all organizations
          </p>
          {statusFilter && (
            <Badge variant="outline" className="mt-2 text-xs">
              Filtered by: {statusFilter}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="icon-sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data?.totalCollections || 0)}</div>
                <p className="text-xs text-muted-foreground">Across all organizations</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(collectionsByOrg || {}).length}</div>
                <p className="text-xs text-muted-foreground">With active collections</p>
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
                  {data?.totalVectors ? `${Math.round((data.totalIndexed / data.totalVectors) * 100)}% indexed` : "0%"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Collections</CardTitle>
                  <CardDescription>
                    Collection format: org_{"{orgId}"}_event_{"{eventId}"}_faces
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search collections..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCollections && filteredCollections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Vectors</TableHead>
                      <TableHead className="text-right">Indexed</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.map((c) => {
                      const progress = c.vectorCount > 0 ? Math.round((c.indexedVectorCount / c.vectorCount) * 100) : 100;

                      return (
                        <TableRow key={c.collectionName}>
                          <TableCell className="font-mono text-xs">
                            <Link
                              href={`/organizations/${c.orgId}?tab=collections`}
                              className="hover:underline text-primary cursor-pointer"
                            >
                              {c.collectionName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === "green" ? "success" : "warning"}>{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(c.vectorCount)}</TableCell>
                          <TableCell className="text-right">{formatNumber(c.indexedVectorCount)}</TableCell>
                          <TableCell className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-2" />
                              <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/collections/${encodeURIComponent(c.collectionName)}/settings`}>
                              <Button variant="ghost" size="icon-sm" title="Collection Settings">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Database className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">{searchTerm ? "No matching collections" : filteredCollections ? "No collections found matching filter" : "No collections found"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-96 w-full" />
        </div>
      }>
        <CollectionsContent />
      </Suspense>
    </AppLayout>
  );
}

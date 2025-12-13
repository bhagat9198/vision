"use client";

import { useCallback } from "react";
import { CheckCircle, XCircle, RefreshCw, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePollingApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatUptime } from "@/lib/utils";
import type { HealthCheckResponse } from "@/lib/types";

export function HealthStatus() {
  const fetcher = useCallback(() => api.getDetailedHealth(), []);
  const { data, loading, error, refetch } = usePollingApi<HealthCheckResponse>(
    fetcher,
    30000 // Poll every 30 seconds
  );

  if (loading && !data) {
    return <HealthStatusSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Health</span>
            <Button variant="ghost" size="icon-sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <span>Unable to connect to backend</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = data?.status === "healthy";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>System Health</span>
            <Badge variant={isHealthy ? "success" : "warning"}>
              {data?.status || "unknown"}
            </Badge>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.services && Object.entries(data.services).map(([name, service]) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {service.status === "up" ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium capitalize">{name}</p>
                {service.latency && (
                  <p className="text-xs text-muted-foreground">
                    {service.latency}ms
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {data?.uptime && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Uptime: {formatUptime(data.uptime)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthStatusSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


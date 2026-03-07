"use client";

import { useState, useCallback, useEffect } from "react";
import { Users, Loader2, RefreshCw, Play, Merge, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useApi, usePollingApi } from "@/lib/hooks/use-api";
import type { PersonCluster, ClusteringJob } from "@/lib/types";
import { ClusterGrid } from "./cluster-grid";
import { ClusterDetail } from "./cluster-detail";

interface PersonGalleryProps {
  eventId: string;
  eventSlug: string;
}

export function PersonGallery({ eventId, eventSlug }: PersonGalleryProps) {
  const [selectedCluster, setSelectedCluster] = useState<PersonCluster | null>(null);
  const [clusteringJobId, setClusteringJobId] = useState<string | null>(null);
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());

  // Fetch clusters
  const {
    data: clusterData,
    loading: clustersLoading,
    refetch: refetchClusters,
  } = useApi(
    useCallback(() => api.getEventClusters(eventId, true), [eventId]),
    { dependencies: [eventId] }
  );

  // Poll for job status if a job is running
  const {
    data: jobData,
    loading: jobLoading,
  } = usePollingApi(
    useCallback(() => api.getClusteringJobStatus(clusteringJobId!), [clusteringJobId]),
    3000,
    { skip: !clusteringJobId }
  );

  // Handle job completion
  useEffect(() => {
    if (jobData?.data?.job) {
      const job = jobData.data.job;
      if (job.status === 'COMPLETED') {
        toast.success(`Clustering complete! Found ${job.clustersCreated} people.`);
        setClusteringJobId(null);
        refetchClusters();
      } else if (job.status === 'FAILED') {
        toast.error(`Clustering failed: ${job.error}`);
        setClusteringJobId(null);
      }
    }
  }, [jobData, refetchClusters]);

  // Start clustering
  const handleRunClustering = async () => {
    try {
      const response = await api.runClustering(eventId, eventSlug);
      if (response.success && response.data) {
        setClusteringJobId(response.data.jobId);
        toast.info('Clustering started...');
      } else {
        toast.error(response.error || 'Failed to start clustering');
      }
    } catch (error) {
      toast.error('Failed to start clustering');
    }
  };

  // Merge selected clusters
  const handleMergeClusters = async () => {
    if (selectedClusters.size < 2) {
      toast.warning('Select at least 2 clusters to merge');
      return;
    }
    try {
      const response = await api.mergeClusters(Array.from(selectedClusters));
      if (response.success) {
        toast.success(`Merged ${selectedClusters.size} clusters`);
        setSelectedClusters(new Set());
        refetchClusters();
      } else {
        toast.error(response.error || 'Failed to merge clusters');
      }
    } catch (error) {
      toast.error('Failed to merge clusters');
    }
  };

  const clusters = clusterData?.data?.clusters || [];
  const totalFaces = clusterData?.data?.totalFaces || 0;
  const isJobRunning = clusteringJobId !== null;

  if (selectedCluster) {
    return (
      <ClusterDetail
        cluster={selectedCluster}
        eventId={eventId}
        eventSlug={eventSlug}
        onBack={() => setSelectedCluster(null)}
        onClusterUpdated={refetchClusters}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              People
            </CardTitle>
            <CardDescription>
              {clusters.length} people detected from {totalFaces} faces
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedClusters.size >= 2 && (
              <Button variant="outline" size="sm" onClick={handleMergeClusters}>
                <Merge className="h-4 w-4 mr-2" />
                Merge ({selectedClusters.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={refetchClusters}
              disabled={clustersLoading}
            >
              <RefreshCw className={`h-4 w-4 ${clustersLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleRunClustering}
              disabled={isJobRunning}
              size="sm"
            >
              {isJobRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clustering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Clustering
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {clustersLoading && clusters.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : clusters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No people detected yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run clustering to group faces by person
            </p>
          </div>
        ) : (
          <ClusterGrid
            clusters={clusters}
            selectedClusters={selectedClusters}
            onSelectCluster={setSelectedCluster}
            onToggleSelection={(id) => {
              const newSet = new Set(selectedClusters);
              if (newSet.has(id)) {
                newSet.delete(id);
              } else {
                newSet.add(id);
              }
              setSelectedClusters(newSet);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}


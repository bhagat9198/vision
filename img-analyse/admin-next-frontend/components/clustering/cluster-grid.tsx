"use client";

import { useState } from "react";
import { Check, User, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import type { PersonCluster } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ClusterGridProps {
  clusters: PersonCluster[];
  selectedClusters: Set<string>;
  onSelectCluster: (cluster: PersonCluster) => void;
  onToggleSelection: (clusterId: string) => void;
}

export function ClusterGrid({
  clusters,
  selectedClusters,
  onSelectCluster,
  onToggleSelection,
}: ClusterGridProps) {
  // Separate noise cluster from regular clusters
  const regularClusters = clusters.filter((c) => !c.isNoise);
  const noiseCluster = clusters.find((c) => c.isNoise);

  return (
    <div className="space-y-6">
      {/* Regular clusters grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {regularClusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            isSelected={selectedClusters.has(cluster.id)}
            onSelect={() => onSelectCluster(cluster)}
            onToggleSelection={() => onToggleSelection(cluster.id)}
          />
        ))}
      </div>

      {/* Noise cluster */}
      {noiseCluster && noiseCluster.faceCount > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unclustered Faces ({noiseCluster.faceCount})
          </h4>
          <ClusterCard
            cluster={noiseCluster}
            isSelected={selectedClusters.has(noiseCluster.id)}
            onSelect={() => onSelectCluster(noiseCluster)}
            onToggleSelection={() => onToggleSelection(noiseCluster.id)}
            variant="noise"
          />
        </div>
      )}
    </div>
  );
}

interface ClusterCardProps {
  cluster: PersonCluster;
  isSelected: boolean;
  onSelect: () => void;
  onToggleSelection: () => void;
  variant?: "default" | "noise";
}

function ClusterCard({
  cluster,
  isSelected,
  onSelect,
  onToggleSelection,
  variant = "default",
}: ClusterCardProps) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = cluster.representativeFaceId
    ? api.getClusterThumbnailUrl(cluster.id, 150, "jpeg")
    : null;

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        variant === "noise" && "border-dashed opacity-75"
      )}
    >
      {/* Selection checkbox */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelection();
        }}
      >
        <div
          className={cn(
            "h-5 w-5 rounded border flex items-center justify-center transition-colors",
            isSelected
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-background/80 border-muted-foreground/50 group-hover:border-muted-foreground"
          )}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="aspect-square relative" onClick={onSelect}>
        {thumbnailUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={cluster.name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 text-center" onClick={onSelect}>
        <p className="text-sm font-medium truncate">{cluster.name}</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {cluster.faceCount} {cluster.faceCount === 1 ? "face" : "faces"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {cluster.photoCount} {cluster.photoCount === 1 ? "photo" : "photos"}
          </Badge>
        </div>
      </div>
    </div>
  );
}


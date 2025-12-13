"use client";

import { useCallback, useState } from "react";
import { Plus, RefreshCw, Building2 } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { OrganizationListItem } from "@/lib/types";
import { CreateOrgDialog } from "./create-org-dialog";

export default function OrganizationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const fetcher = useCallback(async () => {
    const response = await api.listOrganizations();
    return response.data || [];
  }, []);

  const { data: orgs, loading, error, refetch } = useApi<OrganizationListItem[]>(fetcher);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground">
              Manage organizations and their settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon-sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <OrgsTableSkeleton />
            ) : error ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Failed to load organizations</p>
                <p className="text-sm">{error.message}</p>
              </div>
            ) : orgs && orgs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <Badge variant={org.isActive ? "success" : "secondary"}>
                          {org.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(org.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/organizations/${org.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Building2 className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">No organizations found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first organization
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateOrgDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
    </AppLayout>
  );
}

function OrgsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}


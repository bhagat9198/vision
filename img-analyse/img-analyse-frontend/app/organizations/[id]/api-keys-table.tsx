"use client";

import { useCallback, useState } from "react";
import { Plus, RefreshCw, Key, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ApiKeyListItem } from "@/lib/types";

interface ApiKeysTableProps {
  orgId: string;
}

export function ApiKeysTable({ orgId }: ApiKeysTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetcher = useCallback(async () => {
    const response = await api.listApiKeys(orgId);
    return response.data || [];
  }, [orgId]);

  const { data: keys, loading, refetch } = useApi<ApiKeyListItem[]>(fetcher);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error("Key name is required");
      return;
    }

    setCreating(true);
    try {
      const response = await api.createApiKey(orgId, keyName.trim());
      if (response.success && response.data) {
        setNewKey(response.data.key);
        toast.success("API key created");
        refetch();
      } else {
        toast.error(response.error || "Failed to create API key");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setKeyName("");
    setNewKey(null);
    setCopied(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>Manage API keys for this organization</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon-sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Key
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : keys && keys.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-sm">{key.keyPreview}</TableCell>
                  <TableCell>
                    <Badge variant={key.isActive ? "success" : "secondary"}>
                      {key.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(key.createdAt)}</TableCell>
                  <TableCell>{key.expiresAt ? formatDate(key.expiresAt) : "Never"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Key className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2">No API keys found</p>
            <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Create your first API key
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newKey ? "API Key Created" : "Create API Key"}</DialogTitle>
            <DialogDescription>
              {newKey ? "Copy this key now. You won't be able to see it again." : "Create a new API key for this organization."}
            </DialogDescription>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                <code className="flex-1 break-all text-sm">{newKey}</code>
                <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="keyName">Key Name *</Label>
                  <Input id="keyName" placeholder="Production API Key" value={keyName} onChange={(e) => setKeyName(e.target.value)} disabled={creating} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={creating}>Cancel</Button>
                <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}


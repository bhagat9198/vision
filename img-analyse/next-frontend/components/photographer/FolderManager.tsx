'use client';

import { useState } from 'react';
import { Folder, FolderPlus, MoreVertical, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Album } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FolderManagerProps {
  folders: Album[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

export function FolderManager({ folders, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder }: FolderManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const handleRename = (folderId: string) => {
    if (editingName.trim()) {
      onRenameFolder(folderId, editingName.trim());
      setEditingId(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {/* All Photos */}
        <button
          onClick={() => onSelectFolder(null)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
            selectedFolderId === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
        >
          <Folder className="h-5 w-5" />
          <span className="font-medium">All Photos</span>
        </button>

        {/* Folders */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg transition-colors group',
              selectedFolderId === folder.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-50 cursor-grab" />
            {editingId === folder.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(folder.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(folder.id)}
                className="h-8"
                autoFocus
              />
            ) : (
              <button
                onClick={() => onSelectFolder(folder.id)}
                className="flex-1 flex items-center gap-3 text-left"
              >
                <Folder className="h-5 w-5" />
                <span className="font-medium truncate">{folder.name}</span>
                <span className="text-xs opacity-70">({folder.photoCount})</span>
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditingId(folder.id); setEditingName(folder.name); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeleteFolder(folder.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {/* Create Folder */}
        {isCreating ? (
          <div className="flex gap-2 p-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreate}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setIsCreating(true)}>
            <FolderPlus className="h-5 w-5" />
            <span>Create Folder</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

